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
    // Start waiting before the action so a fast response is not missed.
    const sortedListing = this.page.waitForResponse((response) => response.url().includes('/products?') && response.url().includes('sort='));
    await this.page.getByTestId('sort').selectOption({ label });
    await sortedListing;
  }

  async search(query: string): Promise<void> {
    const searchResults = this.page.waitForResponse((response) => response.url().includes('/products/search'));
    await this.page.getByTestId('search-query').fill(query);
    await this.page.getByTestId('search-submit').click();
    await searchResults;
    await expect(this.page.getByTestId('search-caption')).toContainText(query);
  }

  async openProduct(name: string): Promise<void> {
    await this.cards().filter({ has: this.page.getByTestId('product-name').getByText(name, { exact: true }) }).click();
    await expect(this.page.getByTestId('product-name')).toHaveText(name);
  }

  async visibleCards(): Promise<CatalogCard[]> {
    const names = await this.cards().getByTestId('product-name').allTextContents();
    const prices = await this.cards().getByTestId('product-price').allTextContents();
    return names.map((name, index) => ({ name: name.trim(), price: Number((prices[index] ?? '').replace(/[^0-9.]/g, '')) }));
  }

  /** Cards of every page in display order, following the pagination control. */
  async allCards(): Promise<CatalogCard[]> {
    const pageNumbers = (await this.pagination().getByText(/^\d+$/).allTextContents()).map(Number);
    const lastPage = Math.max(1, ...pageNumbers);
    const cards = await this.visibleCards();
    for (let pageNumber = 2; pageNumber <= lastPage; pageNumber++) {
      const pageLoaded = this.page.waitForResponse((response) => response.url().includes('/products?') && response.url().includes(`page=${pageNumber}`));
      await this.pagination().getByText(String(pageNumber), { exact: true }).click();
      await pageLoaded;
      // The grid is re-rendered after the response; the pager text confirms the page switch before reading cards.
      await expect(this.pagination()).toContainText(`You're on page ${pageNumber}`);
      cards.push(...(await this.visibleCards()));
    }
    return cards;
  }
}
