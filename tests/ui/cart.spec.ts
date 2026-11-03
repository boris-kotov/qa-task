import { test, expect } from '../../src/fixtures';
import { storedCart } from '../../src/pages/checkout.page';
import { toCents } from '../../src/data/factories';

test.describe('Cart', () => {
  test('TC-013 adding a product that is already in the cart increases its quantity', {
    tag: ['@ui', '@critical', '@TC-013', '@bug-BUG-005'],
  }, async ({ page, api, productPage, checkout }) => {
    test.fail(true, 'BUG-005: adding the same product again replaces the quantity instead of adding to it');
    const [item] = await api.pickInStockProducts(1, 2);

    await test.step(`Add "${item!.name}" to the cart twice (quantity 1 each time)`, async () => {
      await productPage.open(item!);
      await productPage.addToCart(1);
      await productPage.addToCart(1);
    });

    await test.step('The cart has one line with quantity 2', async () => {
      await expect
        .poll(async () => (await storedCart(page)).map((l) => ({ id: l.id, quantity: l.quantity })), { message: 'cart lines', timeout: 5_000 })
        .toEqual([{ id: item!.id, quantity: 2 }]);
    });

    await test.step('The cart total in the UI is 2 × price', async () => {
      await checkout.open();
      expect(toCents(await checkout.cartTotal())).toBe(2 * toCents(item!.price));
    });
  });

  test('TC-014 changing a quantity in the cart recalculates the cart total', {
    tag: ['@ui', '@critical', '@TC-014', '@bug-BUG-022'],
  }, async ({ page, api, productPage, checkout }) => {
    test.fail(true, 'BUG-022: no "Product quantity updated." message after changing a quantity in the cart (totals are checked first)');
    // Test data from TEST_CASES.md (seed): Combination Pliers $14.15 and Pliers $12.01. The cart does not consume stock.
    const first = await api.product(1);
    const second = await api.product(2);
    expect((first.stock ?? 0) > 0 && (second.stock ?? 0) > 0, 'both products are in stock (reset the DB otherwise)').toBe(true);

    await test.step(`Add "${first.name}" and "${second.name}" (quantity 1 each)`, async () => {
      await productPage.open(first);
      await productPage.addToCart(1);
      await productPage.open(second);
      await productPage.addToCart(1);
    });

    await test.step(`Change the quantity of "${first.name}" to 3 in the cart`, async () => {
      await checkout.open();
      await checkout.setQuantity(first.name, 3);
    });

    await test.step('The stored cart has the new quantity and the other line is unchanged', async () => {
      await expect
        .poll(async () => (await storedCart(page)).map((l) => ({ id: l.id, quantity: l.quantity })).sort((a, b) => a.id - b.id), {
          message: 'cart lines after the update',
          timeout: 5_000,
        })
        .toEqual([{ id: first.id, quantity: 3 }, { id: second.id, quantity: 1 }]);
    });

    const expectedTotal = 3 * toCents(first.price) + toCents(second.price);

    await test.step(`The cart total in the UI is ${expectedTotal / 100}`, async () => {
      await expect.poll(async () => toCents(await checkout.cartTotal()), { message: 'cart total (cents)', timeout: 5_000 }).toBe(expectedTotal);
    });

    await test.step('Confirmation message "Product quantity updated." was shown (CART AC2)', async () => {
      await expect(page.getByText('Product quantity updated.')).toBeVisible();
    });
  });
});
