import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export type CatalogCard = { name: string; price: number };

/** Home page: product grid, sort, search, pagination. */
export class CatalogPage {
  constructor(private readonly page: Page) {}

  private readonly cards = () => this.page.locator('a[data-test^="product-"]');
  private readonly pagination = () => this.page.getByRole('navigation', { name: 'Pagination' });

  async open(): Promise<void> {
    await this.page.goto('/');
    await expect(this.cards().first()).toBeVisible();
  }

  /** Selects a sort option by its visible label and waits for the sorted listing to load. */
  async sortBy(label: string): Promise<void> {
    const sorted = this.page.waitForResponse((r) => r.url().includes('/products?') && r.url().includes('sort='));
    await this.page.getByTestId('sort').selectOption({ label });
    await sorted;
  }

  async search(query: string): Promise<void> {
    const searched = this.page.waitForResponse((r) => r.url().includes('/products/search'));
    await this.page.getByTestId('search-query').fill(query);
    await this.page.getByTestId('search-submit').click();
    await searched;
    await expect(this.page.getByTestId('search-caption')).toContainText(query);
  }

  async openProduct(name: string): Promise<void> {
    await this.cards().filter({ has: this.page.getByTestId('product-name').getByText(name, { exact: true }) }).click();
    await expect(this.page.getByTestId('product-name')).toHaveText(name);
  }

  async visibleCards(): Promise<CatalogCard[]> {
    const names = await this.cards().getByTestId('product-name').allTextContents();
    const prices = await this.cards().getByTestId('product-price').allTextContents();
    return names.map((name, i) => ({ name: name.trim(), price: Number((prices[i] ?? '').replace(/[^0-9.]/g, '')) }));
  }

  /** Cards of every page in display order, following the pagination control. */
  async allCards(): Promise<CatalogCard[]> {
    const pageNumbers = (await this.pagination().getByText(/^\d+$/).allTextContents()).map(Number);
    const lastPage = Math.max(1, ...pageNumbers);
    const all = await this.visibleCards();
    for (let n = 2; n <= lastPage; n++) {
      const loaded = this.page.waitForResponse((r) => r.url().includes('/products?') && r.url().includes(`page=${n}`));
      await this.pagination().getByText(String(n), { exact: true }).click();
      await loaded;
      await expect(this.pagination()).toContainText(`You're on page ${n}`);
      all.push(...(await this.visibleCards()));
    }
    return all;
  }
}
