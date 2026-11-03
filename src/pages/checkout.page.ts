import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { z } from 'zod';
import { billingAddress } from '../data/factories';

const cartLine = z.object({ id: z.number().int(), name: z.string(), quantity: z.number(), price: z.number(), total: z.number() });
export type CartLine = z.infer<typeof cartLine>;

/** The cart lives only in the browser: sessionStorage['cart'] (no cart API in this build). */
export async function storedCart(page: Page): Promise<CartLine[]> {
  const cartJson = await page.evaluate(() => window.sessionStorage.getItem('cart'));
  return cartJson ? z.array(cartLine).parse(JSON.parse(cartJson)) : [];
}

/** Product id → quantity of every cart line, sorted by id (stable for comparisons). */
export async function cartQuantities(page: Page): Promise<{ id: number; quantity: number }[]> {
  return (await storedCart(page)).map((line) => ({ id: line.id, quantity: line.quantity })).sort((a, b) => a.id - b.id);
}

/** Money shown in the UI, e.g. "$1,234.56" → 1234.56. */
export const money = (text: string): number => Number(text.replace(/[^0-9.]/g, ''));

/** Checkout wizard: cart → sign in → address → payment. */
export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/#/checkout');
    await expect(this.page.getByTestId('cart-total')).toBeVisible();
  }

  /** Cart table row of a product, found by its exact title. */
  row(productName: string) {
    return this.page.getByRole('row').filter({ has: this.page.getByTestId('product-title').getByText(productName, { exact: true }) });
  }

  async cartTotal(): Promise<number> {
    return money(await this.page.getByTestId('cart-total').innerText());
  }

  async setQuantity(productName: string, quantity: number): Promise<void> {
    const quantityInput = this.row(productName).getByTestId('product-quantity');
    await quantityInput.fill(String(quantity));
    // The cart recalculates on "change", which fires when the field loses focus.
    await quantityInput.press('Tab');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.page.getByTestId('proceed-1').click();
    await this.page.getByTestId('email').fill(email);
    await this.page.getByTestId('password').fill(password);
    await this.page.getByTestId('login-submit').click();
    await expect(this.page.getByTestId('proceed-2')).toBeVisible();
    await this.page.getByTestId('proceed-2').click();
  }

  /** Fills every field explicitly: the postcode pre-fill is broken (BUG-012). */
  async fillAddress(): Promise<void> {
    await this.page.getByTestId('address').fill(billingAddress.address);
    await this.page.getByTestId('city').fill(billingAddress.city);
    await this.page.getByTestId('state').fill(billingAddress.state);
    await this.page.getByTestId('country').fill(billingAddress.country);
    await this.page.getByTestId('postcode').fill(billingAddress.postcode);
    await this.page.getByTestId('proceed-3').click();
  }

  /**
   * First Confirm runs the payment check ("Payment was successful"), the second places the order.
   * Returns the invoice number from the confirmation.
   */
  async pay(method: string, accountName: string, accountNumber: string): Promise<string> {
    await this.page.getByTestId('payment-method').selectOption({ label: method });
    await this.page.getByTestId('account-name').fill(accountName);
    await this.page.getByTestId('account-number').fill(accountNumber);
    await this.page.getByTestId('finish').click();
    await expect(this.page.getByText('Payment was successful')).toBeVisible();
    await this.page.getByTestId('finish').click();
    const confirmation = this.page.getByText(/Your invoice number is INV-\d+/);
    await expect(confirmation).toBeVisible();
    return /INV-\d+/.exec(await confirmation.innerText())![0];
  }
}
