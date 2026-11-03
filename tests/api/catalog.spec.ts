import { test, expect } from '../../src/fixtures';
import type { Product } from '../../src/api/schemas';

/** Seed data (migrate:fresh --seed): ids are stable for the pinned app commit. */
const PLIERS_CATEGORY_ID = 7;
const BRAND_NAME_2_ID = 2;

/** Product ids in ascending order, so result sets can be compared regardless of their sort order. */
const sortedIds = (products: Product[]): number[] => products.map((product) => product.id).sort((a, b) => a - b);

test('TC-002 TC-005 search and combined category + brand filter return exactly the matching products', {
  tag: ['@api', '@TC-002', '@TC-005'],
}, async ({ api }) => {
  // Oracle: the expected results are computed by the test from the full catalog, not taken from the endpoint under test.
  const allCatalogProducts = await test.step('Load the full catalog (oracle)', () => api.allProducts());

  await test.step('Search "pliers" returns every product whose name contains "pliers" and nothing else', async () => {
    const expectedIds = sortedIds(allCatalogProducts.filter((product) => /pliers/i.test(product.name)));
    const actualIds = sortedIds(await api.allProducts('/products/search', { q: 'pliers' }));
    expect(expectedIds.length, 'oracle is not empty').toBeGreaterThan(0);
    expect(actualIds).toEqual(expectedIds);
  });

  await test.step('Category Pliers AND Brand name 2 returns exactly the products matching both', async () => {
    const expectedIds = sortedIds(allCatalogProducts.filter((product) => product.category_id === PLIERS_CATEGORY_ID && product.brand_id === BRAND_NAME_2_ID));
    const actualIds = sortedIds(await api.allProducts('/products', { by_category: String(PLIERS_CATEGORY_ID), by_brand: String(BRAND_NAME_2_ID) }));
    expect(expectedIds.length, 'oracle is not empty').toBeGreaterThan(0);
    expect(actualIds).toEqual(expectedIds);
  });
});
