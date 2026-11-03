import { test, expect } from '../../src/fixtures';

/** Seed data (migrate:fresh --seed): ids are stable for the pinned app commit. */
const PLIERS_CATEGORY_ID = 7;
const BRAND_2_ID = 2;

test('TC-002 TC-005 search and combined category + brand filter return exactly the matching products', {
  tag: ['@api', '@TC-002', '@TC-005'],
}, async ({ api }) => {
  const catalog = await test.step('Load the full catalog (oracle)', () => api.allProducts());

  await test.step('Search "pliers" returns every product whose name contains "pliers" and nothing else', async () => {
    const expected = catalog.filter((p) => /pliers/i.test(p.name)).map((p) => p.id).sort((a, b) => a - b);
    const actual = (await api.allProducts('/products/search', { q: 'pliers' })).map((p) => p.id).sort((a, b) => a - b);
    expect(expected.length, 'oracle is not empty').toBeGreaterThan(0);
    expect(actual).toEqual(expected);
  });

  await test.step('Category Pliers AND Brand name 2 returns exactly the products matching both', async () => {
    const expected = catalog.filter((p) => p.category_id === PLIERS_CATEGORY_ID && p.brand_id === BRAND_2_ID).map((p) => p.id).sort((a, b) => a - b);
    const actual = (await api.allProducts('/products', { by_category: String(PLIERS_CATEGORY_ID), by_brand: String(BRAND_2_ID) }))
      .map((p) => p.id).sort((a, b) => a - b);
    expect(expected.length, 'oracle is not empty').toBeGreaterThan(0);
    expect(actual).toEqual(expected);
  });
});
