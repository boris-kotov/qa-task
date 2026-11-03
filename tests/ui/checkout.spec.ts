import { test, expect } from '../../src/fixtures';
import { billingAddress, orderTotal, toCents } from '../../src/data/factories';
import type { OrderItem } from '../../src/data/factories';
import { storedCart } from '../../src/pages/checkout.page';

test('TC-023 customer finds a product by search, checks out with Cash on Delivery and the invoice matches the cart', {
  tag: ['@ui', '@critical', '@smoke', '@TC-023'],
}, async ({ page, api, customer, catalog, productPage, checkout }) => {
  // Fixed test data from TEST_CASES.md (seed): Pliers $12.01 × 2 + Slip Joint Pliers $9.17 × 1 = $33.19.
  // Random products made this test flaky: some price combinations hit BUG-021 (total truncated by 1 cent, also on the
  // invoice) and some names break the search (BUG-027, BUG-028). Each order consumes 3 items of stock, so reset the
  // DB (RESET_DB=true) before long repeated runs.
  const pliers = await api.product(2);
  const slipJointPliers = await api.product(5);
  expect((pliers.stock ?? 0) >= 2 && (slipJointPliers.stock ?? 0) >= 1, 'products are in stock (reset the DB otherwise)').toBe(true);

  const orderItems: OrderItem[] = [
    { product: pliers, quantity: 2 },
    { product: slipJointPliers, quantity: 1 },
  ];

  await test.step(`Search "pliers", open "${pliers.name}" and add 2 to the cart`, async () => {
    await catalog.open();
    await catalog.search('pliers');
    await catalog.openProduct(pliers.name);
    await productPage.shows(pliers);
    await productPage.addToCart(2);
  });

  await test.step(`Add 1 × "${slipJointPliers.name}"`, async () => {
    await productPage.open(slipJointPliers);
    await productPage.addToCart(1);
  });

  const invoiceNumber = await test.step('Check out: sign in, billing address, Cash on Delivery, confirm', async () => {
    await checkout.open();
    // The displayed cart total is not asserted here: it is TC-014's job, and with random prices it depends on
    // BUG-021 (total truncated by 1 cent). The order total is asserted on the stored invoice below.
    // Signing in through the form is part of the flow under test (no token injection here).
    await checkout.signIn(customer.email, customer.password);
    await checkout.fillAddress();
    return checkout.pay('Cash on Delivery', `${customer.firstName} ${customer.lastName}`, '1234567890');
  });

  await test.step('The cart is cleared after the order', async () => {
    expect(await storedCart(page)).toEqual([]);
  });

  await test.step(`Invoice ${invoiceNumber} belongs to the customer and matches the cart`, async () => {
    // ownInvoices filters by user_id because GET /invoices also returns other customers' invoices (BUG-001).
    const matchingInvoices = (await api.ownInvoices(customer.token, customer.id)).filter((invoice) => invoice.invoice_number === invoiceNumber);
    expect(matchingInvoices, 'exactly one invoice with the confirmed number').toHaveLength(1);

    const invoice = matchingInvoices[0]!;
    expect(invoice.payment_method).toBe('Cash on Delivery');
    expect(toCents(invoice.total)).toBe(toCents(orderTotal(orderItems)));
    expect(invoice).toMatchObject({ billing_address: billingAddress.address, billing_city: billingAddress.city, billing_postcode: billingAddress.postcode });

    const storedLines = invoice.invoicelines.map((line) => ({ product_id: line.product_id, quantity: line.quantity, unit_price: line.unit_price }));
    const expectedLines = orderItems.map(({ product, quantity }) => ({ product_id: product.id, quantity, unit_price: product.price }));
    // Same length + arrayContaining = equal sets of lines, independent of their order.
    expect(storedLines).toHaveLength(expectedLines.length);
    expect(storedLines).toEqual(expect.arrayContaining(expectedLines));
  });
});
