import type { APIResponse } from '@playwright/test';
import { test, expect } from '../../src/fixtures';
import { billingAddress, invoicePayload, orderTotal, toCents } from '../../src/data/factories';
import type { InvoicePayload, OrderItem } from '../../src/data/factories';
import type { ToolshopApi } from '../../src/api/toolshop.api';

/**
 * TC-025 accepts two correct outcomes: the server rejects the tampered order (4xx),
 * or it accepts it but stores the catalog price. Returns 'rejected' or the stored unit price,
 * so the test can assert both outcomes in one expectation without branching.
 */
async function rejectedOrStoredUnitPrice(api: ToolshopApi, token: string, response: APIResponse): Promise<'rejected' | number | undefined> {
  if (response.status() >= 400 && response.status() < 500) return 'rejected';
  expect(response.status(), await response.text()).toBe(201);
  const { id: invoiceId } = (await response.json()) as { id: number };
  const storedInvoice = await api.invoice(token, invoiceId);
  return storedInvoice.invoicelines[0]?.unit_price;
}

test.describe('Orders via API', () => {
  test('TC-024 order creates an invoice with the ordered lines, catalog prices, total and payment method', {
    tag: ['@api', '@critical', '@TC-024'],
  }, async ({ api, customer }) => {
    const [productOrderedTwice, productOrderedOnce] = await test.step('Pick two in-stock products from the catalog', () => api.pickInStockProducts(2));

    const orderItems: OrderItem[] = [
      { product: productOrderedTwice!, quantity: 2 },
      { product: productOrderedOnce!, quantity: 1 },
    ];
    const expectedTotal = orderTotal(orderItems);

    const createdInvoice = await test.step('Place the order (POST /invoices) with Bank Transfer', () =>
      api.createInvoiceOk(customer.token, invoicePayload(customer.id, orderItems, { payment_method: 'Bank Transfer' })));

    // Read the invoice back instead of trusting the POST response: the stored data is the outcome that matters.
    const storedInvoice = await test.step('Read the stored invoice (GET /invoices/{id})', () => api.invoice(customer.token, createdInvoice.id));

    await test.step('Invoice belongs to the customer and has the expected header', () => {
      expect(storedInvoice.invoice_number).toBe(createdInvoice.invoice_number);
      expect(storedInvoice.user_id).toBe(customer.id);
      expect(storedInvoice.payment_method).toBe('Bank Transfer');
      expect(storedInvoice).toMatchObject({
        billing_address: billingAddress.address,
        billing_city: billingAddress.city,
        billing_state: billingAddress.state,
        billing_country: billingAddress.country,
        billing_postcode: billingAddress.postcode,
      });
      // Money is compared in cents to avoid floating point noise (e.g. 28.3 vs 28.300000000000001).
      expect(toCents(storedInvoice.total)).toBe(toCents(expectedTotal));
    });

    await test.step('Invoice lines equal the ordered products, quantities and catalog prices', () => {
      const storedLines = storedInvoice.invoicelines.map((line) => ({ product_id: line.product_id, quantity: line.quantity, unit_price: line.unit_price }));
      const expectedLines = orderItems.map(({ product, quantity }) => ({ product_id: product.id, quantity, unit_price: product.price }));
      // Same length + arrayContaining = equal sets of lines, independent of the order the API returns them in.
      expect(storedLines).toHaveLength(expectedLines.length);
      expect(storedLines).toEqual(expect.arrayContaining(expectedLines));
    });
  });

  test('TC-025 order with a tampered unit price is rejected or stored with the catalog price', {
    tag: ['@api', '@critical', '@TC-025', '@bug-BUG-017'],
  }, async ({ api, customer }) => {
    // Known defect: the assertion stays strict; test.fail turns this test red as soon as the defect is fixed.
    test.fail(true, 'BUG-017: POST /invoices stores the unit price and total sent by the client');

    const [product] = await test.step('Pick an in-stock product', () => api.pickInStockProducts(1));

    const catalogPrice = product!.price;
    const tamperedPayload = invoicePayload(customer.id, [{ product: product!, quantity: 1 }], {
      total: 0.01,
      invoice_items: [{ product_id: product!.id, quantity: 1, unit_price: 0.01 }],
    });

    const response = await test.step(`Send the order with unit_price 0.01 instead of ${catalogPrice}`, () => api.createInvoice(customer.token, tamperedPayload));

    await test.step('The order is rejected, or the stored invoice uses the catalog price', async () => {
      expect(['rejected', catalogPrice]).toContain(await rejectedOrStoredUnitPrice(api, customer.token, response));
    });
  });

  /** Each case turns a valid payload into an invalid one; all must be rejected with 422 and create no invoice. */
  type InvalidOrderCase = {
    name: string;
    bug: string;
    makeInvalid: (validPayload: InvoicePayload, outOfStockProductId: number) => InvoicePayload;
  };

  const invalidOrderCases: InvalidOrderCase[] = [
    {
      name: 'quantity 0',
      bug: 'BUG-018: an order line with quantity 0 is accepted',
      makeInvalid: (validPayload) => ({
        ...validPayload,
        total: 0,
        invoice_items: validPayload.invoice_items.map((item) => ({ ...item, quantity: 0 })),
      }),
    },
    {
      name: 'a product that is out of stock',
      bug: 'BUG-019: orders are accepted beyond stock, stock becomes negative',
      makeInvalid: (validPayload, outOfStockProductId) => ({
        ...validPayload,
        invoice_items: validPayload.invoice_items.map((item) => ({ ...item, product_id: outOfStockProductId })),
      }),
    },
    {
      name: 'an unknown payment method',
      bug: 'BUG-004: any payment method string is accepted',
      makeInvalid: (validPayload) => ({ ...validPayload, payment_method: 'Missing Payment Gateway' }),
    },
  ];

  for (const invalidCase of invalidOrderCases) {
    const bugId = invalidCase.bug.slice(0, 'BUG-000'.length);

    test(`TC-026 order with ${invalidCase.name} is rejected with 422 and creates no invoice`, {
      tag: ['@api', '@TC-026', `@bug-${bugId}`],
    }, async ({ api, customer }) => {
      test.fail(true, invalidCase.bug);
      const [inStockProduct] = await api.pickInStockProducts(1);
      // "Out of stock" means stock <= 0: earlier runs may have pushed stock below zero (BUG-019).
      const outOfStockProduct = (await api.allProducts()).find((product) => !product.is_rental && (product.stock ?? 0) <= 0);
      expect(outOfStockProduct, 'the seed has a regular product without stock (Long Nose Pliers)').toBeDefined();

      const validPayload = invoicePayload(customer.id, [{ product: inStockProduct!, quantity: 1 }]);
      const invalidPayload = invalidCase.makeInvalid(validPayload, outOfStockProduct!.id);

      const response = await test.step(`POST /invoices with ${invalidCase.name}`, () => api.createInvoice(customer.token, invalidPayload));

      await test.step('Response is 422 Unprocessable Entity', async () => {
        expect(response.status(), await response.text()).toBe(422);
      });

      await test.step('No invoice was created for the customer', async () => {
        expect(await api.ownInvoices(customer.token, customer.id)).toHaveLength(0);
      });
    });
  }
});
