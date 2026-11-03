import { test, expect } from '../../src/fixtures';
import { invoicePayload, newCustomer } from '../../src/data/factories';

test('TC-028 a customer cannot see invoices of another customer', {
  tag: ['@api', '@critical', '@TC-028', '@bug-BUG-001'],
}, async ({ api, customer }) => {
  test.fail(true, "BUG-001: GET /invoices and GET /invoices/{id} return other customers' invoices");

  const owner = await test.step('Another customer (owner) places an order', async () => {
    const data = newCustomer();
    const registered = await api.register(data);
    const token = await api.login(data.email, data.password);
    const [item] = await api.pickInStockProducts(1);
    const created = await api.createInvoiceOk(token, invoicePayload(registered.id, [{ product: item!, quantity: 1 }]));
    return { id: registered.id, invoiceId: created.id };
  });

  await test.step("GET /invoices for the customer contains only the customer's own invoices", async () => {
    const foreignOwners = [...new Set((await api.invoices(customer.token)).map((i) => i.user_id).filter((id) => id !== customer.id))];
    expect(foreignOwners, 'user ids of foreign invoices returned to the customer').toEqual([]);
  });

  await test.step("GET /invoices/{id} of the owner's invoice is refused (403/404)", async () => {
    const response = await api.invoiceResponse(customer.token, owner.invoiceId);
    expect([403, 404], `status ${response.status()}: ${(await response.text()).slice(0, 200)}`).toContain(response.status());
  });
});
