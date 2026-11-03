import { test, expect } from '../../src/fixtures';
import { billingAddress, orderTotal, toCents } from '../../src/data/factories';
import type { OrderItem } from '../../src/data/factories';
import { storedCart } from '../../src/pages/checkout.page';

test('TC-023 customer finds a product by search, checks out with Cash on Delivery and the invoice matches the cart', {
  tag: ['@ui', '@critical', '@smoke', '@TC-023'],
}, async ({ page, api, customer, catalog, productPage, checkout }) => {
  // Products are picked at runtime: orders consume stock, so fixed products would run out under --repeat-each.
  const [fromSearch, other] = await api.pickInStockProducts(2, 3);
  const items: OrderItem[] = [{ product: fromSearch!, quantity: 2 }, { product: other!, quantity: 1 }];

  await test.step(`Search "${fromSearch!.name}", open it and add 2 to the cart`, async () => {
    await catalog.open();
    await catalog.search(fromSearch!.name);
    await catalog.openProduct(fromSearch!.name);
    await productPage.shows(fromSearch!);
    await productPage.addToCart(2);
  });

  await test.step(`Add 1 × "${other!.name}"`, async () => {
    await productPage.open(other!);
    await productPage.addToCart(1);
  });

  const invoiceNumber = await test.step('Check out: sign in, billing address, Cash on Delivery, confirm', async () => {
    await checkout.open();
    expect(toCents(await checkout.cartTotal()), 'cart total before checkout').toBe(toCents(orderTotal(items)));
    await checkout.signIn(customer.email, customer.password);
    await checkout.fillAddress();
    return checkout.pay('Cash on Delivery', `${customer.firstName} ${customer.lastName}`, '1234567890');
  });

  await test.step('The cart is cleared after the order', async () => {
    expect(await storedCart(page)).toEqual([]);
  });

  await test.step(`Invoice ${invoiceNumber} belongs to the customer and matches the cart`, async () => {
    const own = (await api.ownInvoices(customer.token, customer.id)).filter((i) => i.invoice_number === invoiceNumber);
    expect(own, 'exactly one invoice with the confirmed number').toHaveLength(1);
    const invoice = own[0]!;
    expect(invoice.payment_method).toBe('Cash on Delivery');
    expect(toCents(invoice.total)).toBe(toCents(orderTotal(items)));
    expect(invoice).toMatchObject({ billing_address: billingAddress.address, billing_city: billingAddress.city, billing_postcode: billingAddress.postcode });
    expect(invoice.invoicelines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })))
      .toEqual(expect.arrayContaining(items.map(({ product, quantity }) => ({ product_id: product.id, quantity, unit_price: product.price }))));
    expect(invoice.invoicelines).toHaveLength(items.length);
  });
});
