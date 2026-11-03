import { test, expect, knownDefect } from '../../src/fixtures';
import { toCents } from '../../src/data/factories';

test('TC-001 sorting by price low to high orders the whole catalog across all pages', {
  tag: ['@ui', '@TC-001', '@bug-BUG-020'],
}, async ({ api, catalog }) => {
  // Known defect: the assertion stays strict; the test turns red as soon as the defect is fixed.
  knownDefect('BUG-020: "Price (Low - High)" sorts from high to low (sort option values are swapped)', /prices in display order/);

  // Independent oracle: the catalog is loaded unsorted and sorted by the test. Comparing with the API's own
  // `sort=` result would hide a defect that sits in the API.
  const expectedOrder = await test.step('Oracle: full catalog from the API, sorted by price (then name) by the test', async () =>
    (await api.allProducts())
      .map((product) => ({ name: product.name, price: product.price }))
      .sort((a, b) => toCents(a.price) - toCents(b.price) || a.name.localeCompare(b.name)));

  await test.step('Open the catalog and select "Price (Low - High)"', async () => {
    await catalog.open();
    await catalog.sortBy('Price (Low - High)');
  });

  const displayedCards = await test.step('Collect every card on every page', () => catalog.allCards());

  await test.step('All products are shown once, in ascending price order', () => {
    expect(displayedCards).toHaveLength(expectedOrder.length);
    // Prices (not names) are compared: products with equal prices may legitimately appear in any order.
    expect(displayedCards.map((card) => toCents(card.price)), 'prices in display order').toEqual(expectedOrder.map((product) => toCents(product.price)));
  });
});
