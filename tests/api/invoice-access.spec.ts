import { test, expect, knownDefect } from '../../src/fixtures';
import { invoicePayload, newCustomer } from '../../src/data/factories';

test('TC-028 a customer cannot see invoices of another customer', {
  tag: ['@api', '@critical', '@TC-028', '@bug-BUG-001'],
}, async ({ api, customer }) => {
  // Known defect: the assertions stay strict; the test turns red as soon as the defect is fixed.
  knownDefect("BUG-001: GET /invoices and GET /invoices/{id} return other customers' invoices", /user ids of foreign invoices returned to the customer/);

  const otherCustomerOrder = await test.step('Another customer places an order', async () => {
    const otherCustomerData = newCustomer();
    const otherCustomer = await api.register(otherCustomerData);
    const otherCustomerToken = await api.login(otherCustomerData.email, otherCustomerData.password);
    const [product] = await api.pickInStockProducts(1);
    const otherCustomerInvoice = await api.createInvoiceOk(otherCustomerToken, invoicePayload(otherCustomer.id, [{ product: product!, quantity: 1 }]));
    return { userId: otherCustomer.id, invoiceId: otherCustomerInvoice.id };
  });

  await test.step("GET /invoices for the customer contains only the customer's own invoices", async () => {
    const invoicesVisibleToCustomer = await api.invoices(customer.token);
    const foreignUserIds = [...new Set(invoicesVisibleToCustomer.map((invoice) => invoice.user_id).filter((userId) => userId !== customer.id))];
    expect(foreignUserIds, 'user ids of foreign invoices returned to the customer').toEqual([]);
  });

  await test.step("GET /invoices/{id} of the other customer's invoice is refused (403/404)", async () => {
    const response = await api.invoiceResponse(customer.token, otherCustomerOrder.invoiceId);
    expect([403, 404], `status ${response.status()}: ${(await response.text()).slice(0, 200)}`).toContain(response.status());
  });
});
