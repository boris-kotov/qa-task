import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { storedCart } from './checkout.page';
import type { Product } from '../api/schemas';

/** Product detail page. */
export class ProductPage {
  private productId = 0;

  constructor(private readonly page: Page) {}

  async open(product: Product): Promise<void> {
    await this.page.goto(`/#/product/${product.id}`);
    await this.shows(product);
  }

  /** The page is ready when it shows this product (the Add to cart button is enabled before the data arrives). */
  async shows(product: Product): Promise<void> {
    this.productId = product.id;
    await expect(this.page.getByTestId('product-name')).toHaveText(product.name);
    await expect(this.page.getByTestId('unit-price')).toContainText(product.price.toFixed(2));
    await expect(this.page.getByTestId('add-to-cart')).toBeEnabled();
  }

  /**
   * Types the quantity (the +/− buttons do not work, BUG-008) and clicks Add to cart.
   * Waits only until the product is present in the cart; the resulting quantity is asserted by the test.
   */
  async addToCart(quantity = 1): Promise<void> {
    await this.page.getByTestId('quantity').fill(String(quantity));
    await this.page.getByTestId('add-to-cart').click();
    await expect
      .poll(async () => (await storedCart(this.page)).some((line) => line.id === this.productId), {
        message: `product ${this.productId} is in sessionStorage['cart'] after Add to cart`,
        timeout: 5_000,
      })
      .toBe(true);
  }
}
