import type { APIResponse } from '@playwright/test';
import { test, expect } from '../../src/fixtures';
import { billingAddress, invoicePayload, orderTotal, toCents } from '../../src/data/factories';
import type { InvoicePayload, OrderItem } from '../../src/data/factories';
import type { ToolshopApi } from '../../src/api/toolshop.api';

/** 'rejected' for a 4xx response, otherwise the unit price stored on the created invoice. */
async function storedPriceOrRejected(api: ToolshopApi, token: string, response: APIResponse): Promise<'rejected' | number | undefined> {
  if (response.status() >= 400 && response.status() < 500) return 'rejected';
  expect(response.status(), await response.text()).toBe(201);
  const { id } = (await response.json()) as { id: number };
  return (await api.invoice(token, id)).invoicelines[0]?.unit_price;
}

test.describe('Orders via API', () => {
  test('TC-024 order creates an invoice with the ordered lines, catalog prices, total and payment method', {
    tag: ['@api', '@critical', '@TC-024'],
  }, async ({ api, customer }) => {
    const [first, second] = await test.step('Pick two in-stock products from the catalog', () => api.pickInStockProducts(2));

    const items: OrderItem[] = [{ product: first!, quantity: 2 }, { product: second!, quantity: 1 }];
    const expectedTotal = orderTotal(items);

    const created = await test.step('Place the order (POST /invoices) with Bank Transfer', () =>
      api.createInvoiceOk(customer.token, invoicePayload(customer.id, items, { payment_method: 'Bank Transfer' })));

    const stored = await test.step('Read the stored invoice (GET /invoices/{id})', () => api.invoice(customer.token, created.id));

    await test.step('Invoice belongs to the customer and has the expected header', () => {
      expect(stored.invoice_number).toBe(created.invoice_number);
      expect(stored.user_id).toBe(customer.id);
      expect(stored.payment_method).toBe('Bank Transfer');
      expect(stored).toMatchObject({
        billing_address: billingAddress.address,
        billing_city: billingAddress.city,
        billing_state: billingAddress.state,
        billing_country: billingAddress.country,
        billing_postcode: billingAddress.postcode,
      });
      expect(toCents(stored.total)).toBe(toCents(expectedTotal));
    });

    await test.step('Invoice lines equal the ordered products, quantities and catalog prices', () => {
      const lines = stored.invoicelines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price }));
      expect(lines).toHaveLength(items.length);
      expect(lines).toEqual(expect.arrayContaining(items.map(({ product, quantity }) => ({ product_id: product.id, quantity, unit_price: product.price }))));
    });
  });

  test('TC-025 order with a tampered unit price is rejected or stored with the catalog price', {
    tag: ['@api', '@critical', '@TC-025', '@bug-BUG-017'],
  }, async ({ api, customer }) => {
    test.fail(true, 'BUG-017: POST /invoices stores the unit price and total sent by the client');

    const [item] = await test.step('Pick an in-stock product', () => api.pickInStockProducts(1));

    const catalogPrice = item!.price;
    const tampered = invoicePayload(customer.id, [{ product: item!, quantity: 1 }], {
      total: 0.01,
      invoice_items: [{ product_id: item!.id, quantity: 1, unit_price: 0.01 }],
    });

    const response = await test.step(`Send the order with unit_price 0.01 instead of ${catalogPrice}`, () => api.createInvoice(customer.token, tampered));

    await test.step('The order is rejected, or the stored invoice uses the catalog price', async () => {
      expect(['rejected', catalogPrice]).toContain(await storedPriceOrRejected(api, customer.token, response));
    });
  });

  const invalidOrders: { name: string; bug: string; build: (base: InvoicePayload, outOfStockId: number) => InvoicePayload }[] = [
    {
      name: 'quantity 0',
      bug: 'BUG-018: an order line with quantity 0 is accepted',
      build: (base) => ({ ...base, total: 0, invoice_items: base.invoice_items.map((i) => ({ ...i, quantity: 0 })) }),
    },
    {
      name: 'a product that is out of stock',
      bug: 'BUG-019: orders are accepted beyond stock, stock becomes negative',
      build: (base, outOfStockId) => ({ ...base, invoice_items: base.invoice_items.map((i) => ({ ...i, product_id: outOfStockId })) }),
    },
    {
      name: 'an unknown payment method',
      bug: 'BUG-004: any payment method string is accepted',
      build: (base) => ({ ...base, payment_method: 'Missing Payment Gateway' }),
    },
  ];

  for (const row of invalidOrders) {
    const bugId = row.bug.slice(0, 7);

    test(`TC-026 order with ${row.name} is rejected with 422 and creates no invoice`, {
      tag: ['@api', '@TC-026', `@bug-${bugId}`],
    }, async ({ api, customer }) => {
      test.fail(true, row.bug);
      const [item] = await api.pickInStockProducts(1);
      // "Out of stock" = stock <= 0: previous runs may have pushed stock below zero (BUG-019).
      const outOfStock = (await api.allProducts()).find((p) => !p.is_rental && (p.stock ?? 0) <= 0);
      expect(outOfStock, 'the seed has a regular product without stock (Long Nose Pliers)').toBeDefined();
      const payload = row.build(invoicePayload(customer.id, [{ product: item!, quantity: 1 }]), outOfStock!.id);

      const response = await test.step(`POST /invoices with ${row.name}`, () => api.createInvoice(customer.token, payload));

      await test.step('Response is 422 Unprocessable Entity', async () => {
        expect(response.status(), await response.text()).toBe(422);
      });

      await test.step('No invoice was created for the customer', async () => {
        expect(await api.ownInvoices(customer.token, customer.id)).toHaveLength(0);
      });
    });
  }
});
