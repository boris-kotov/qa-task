import { test as base, expect } from '@playwright/test';
import { env, isLocalHost } from './config/env';
import { ToolshopApi } from './api/toolshop.api';
import { newCustomer } from './data/factories';
import { CatalogPage } from './pages/catalog.page';
import { ProductPage } from './pages/product.page';
import { CheckoutPage } from './pages/checkout.page';

export type Customer = { id: number; email: string; password: string; firstName: string; lastName: string; token: string };

type Fixtures = {
  /** Auto fixture: aborts every browser request that leaves the local machine. */
  localOnlyNetwork: void;
  /** Toolshop REST API bound to API_URL (localhost only). */
  api: ToolshopApi;
  /** A new customer registered and logged in via API — unique per test, never a demo account. */
  customer: Customer;
  catalog: CatalogPage;
  productPage: ProductPage;
  checkout: CheckoutPage;
};

/**
 * Entry point for all specs: import { test, expect } from '../../src/fixtures'.
 */
export const test = base.extend<Fixtures>({
  api: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: env.API_URL, extraHTTPHeaders: { Accept: 'application/json' } });
    await use(new ToolshopApi(context));
    await context.dispose();
  },

  customer: async ({ api }, use) => {
    const data = newCustomer();
    const registered = await api.register(data);
    const token = await api.login(data.email, data.password);
    await use({ id: registered.id, email: data.email, password: data.password, firstName: data.first_name, lastName: data.last_name, token });
  },

  catalog: async ({ page }, use) => use(new CatalogPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),

  localOnlyNetwork: [
    async ({ context }, use, testInfo) => {
      const blockedApiCalls: string[] = [];
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.protocol === 'data:' || url.protocol === 'blob:' || isLocalHost(url.hostname)) {
          await route.continue();
          return;
        }
        // Third-party static resources (fonts, analytics) are silently blocked; API calls are a config error.
        if (['xhr', 'fetch'].includes(request.resourceType())) blockedApiCalls.push(`${request.method()} ${url.origin}`);
        testInfo.annotations.push({ type: 'blocked-non-local-request', description: `${request.resourceType()} ${url.origin}` });
        await route.abort('blockedbyclient');
      });

      await use();

      expect(
        blockedApiCalls,
        'The UI tried to call a non-local API: the app is probably running from prebuilt (prod) images. Use the source build.',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
