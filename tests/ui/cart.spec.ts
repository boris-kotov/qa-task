import { test, expect, knownDefect } from '../../src/fixtures';
import type { Product } from '../../src/api/schemas';
import type { ToolshopApi } from '../../src/api/toolshop.api';
import type { CheckoutPage } from '../../src/pages/checkout.page';
import type { ProductPage } from '../../src/pages/product.page';
import { cartQuantities } from '../../src/pages/checkout.page';
import { toCents } from '../../src/data/factories';

test.describe('Cart', () => {
  test('TC-013 adding a product that is already in the cart increases its quantity', {
    tag: ['@ui', '@critical', '@TC-013', '@bug-BUG-005'],
  }, async ({ page, api, productPage, checkout }) => {
    // Known defect: the assertions stay strict; the test turns red as soon as the defect is fixed.
    knownDefect('BUG-005: adding the same product again replaces the quantity instead of adding to it', /cart lines/);
    const [product] = await api.pickInStockProducts(1, 2);

    await test.step(`Add "${product!.name}" to the cart twice (quantity 1 each time)`, async () => {
      await productPage.open(product!);
      await productPage.addToCart(1);
      await productPage.addToCart(1);
    });

    await test.step('The cart has one line with quantity 2', async () => {
      // The cart is written to sessionStorage asynchronously, so the state is polled instead of read once.
      await expect.poll(() => cartQuantities(page), { message: 'cart lines', timeout: 5_000 }).toEqual([{ id: product!.id, quantity: 2 }]);
    });

    await test.step('The cart total in the UI is 2 × price', async () => {
      await checkout.open();
      expect(toCents(await checkout.cartTotal())).toBe(2 * toCents(product!.price));
    });
  });

  test('TC-014 changing a quantity in the cart recalculates the stored cart and the cart total', {
    tag: ['@ui', '@critical', '@TC-014'],
  }, async ({ page, api, productPage, checkout }) => {
    const { combinationPliers, pliers } = await changeQuantityToThree(api, productPage, checkout);

    await test.step('The stored cart has the new quantity and the other line is unchanged', async () => {
      await expect
        .poll(() => cartQuantities(page), { message: 'cart lines after the update', timeout: 5_000 })
        .toEqual([{ id: combinationPliers.id, quantity: 3 }, { id: pliers.id, quantity: 1 }]);
    });

    const expectedTotalCents = 3 * toCents(combinationPliers.price) + toCents(pliers.price);

    await test.step(`The cart total in the UI is ${expectedTotalCents / 100}`, async () => {
      await expect.poll(async () => toCents(await checkout.cartTotal()), { message: 'cart total (cents)', timeout: 5_000 }).toBe(expectedTotalCents);
    });
  });

  // Separate test for the message so that the known defect (BUG-022) cannot hide a regression in the totals above.
  test('TC-014 changing a quantity in the cart shows "Product quantity updated."', {
    tag: ['@ui', '@TC-014', '@bug-BUG-022'],
  }, async ({ page, api, productPage, checkout }) => {
    knownDefect('BUG-022: no "Product quantity updated." message after changing a quantity in the cart', /getByText\('Product quantity updated\.'\)/);
    await changeQuantityToThree(api, productPage, checkout);

    await test.step('Confirmation message "Product quantity updated." is shown (CART AC2)', async () => {
      await expect(page.getByText('Product quantity updated.')).toBeVisible();
    });
  });
});

/**
 * TC-014 setup shared by both TC-014 tests: Combination Pliers ($14.15) and Pliers ($12.01) from the seed
 * (documented test data; adding to the cart does not consume stock), then the first quantity is changed to 3 in the cart.
 */
async function changeQuantityToThree(
  api: ToolshopApi,
  productPage: ProductPage,
  checkout: CheckoutPage,
): Promise<{ combinationPliers: Product; pliers: Product }> {
  const combinationPliers = await api.product(1);
  const pliers = await api.product(2);
  expect((combinationPliers.stock ?? 0) > 0 && (pliers.stock ?? 0) > 0, 'both products are in stock (reset the DB otherwise)').toBe(true);

  await test.step(`Add "${combinationPliers.name}" and "${pliers.name}" (quantity 1 each)`, async () => {
    await productPage.open(combinationPliers);
    await productPage.addToCart(1);
    await productPage.open(pliers);
    await productPage.addToCart(1);
  });

  await test.step(`Change the quantity of "${combinationPliers.name}" to 3 in the cart`, async () => {
    await checkout.open();
    await checkout.setQuantity(combinationPliers.name, 3);
  });

  return { combinationPliers, pliers };
}
