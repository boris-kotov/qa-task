import { test, expect } from '../../src/fixtures';
import { toCents } from '../../src/data/factories';

test('TC-001 sorting by price low to high orders the whole catalog across all pages', {
  tag: ['@ui', '@TC-001', '@bug-BUG-020'],
}, async ({ api, catalog }) => {
  test.fail(true, 'BUG-020: "Price (Low - High)" sorts from high to low (sort option values are swapped)');

  const expected = await test.step('Oracle: full catalog from the API, sorted by price (then name) by the test', async () =>
    (await api.allProducts())
      .map((p) => ({ name: p.name, price: p.price }))
      .sort((a, b) => toCents(a.price) - toCents(b.price) || a.name.localeCompare(b.name)));

  await test.step('Open the catalog and select "Price (Low - High)"', async () => {
    await catalog.open();
    await catalog.sortBy('Price (Low - High)');
  });

  const shown = await test.step('Collect every card on every page', () => catalog.allCards());

  await test.step('All products are shown once, in ascending price order', () => {
    expect(shown).toHaveLength(expected.length);
    expect(shown.map((c) => toCents(c.price)), 'prices in display order').toEqual(expected.map((p) => toCents(p.price)));
  });
});
