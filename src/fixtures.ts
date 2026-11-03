import { test as base, expect } from '@playwright/test';
import { isLocalHost } from './config/env';

type GuardFixtures = {
  /** Auto fixture: aborts every browser request that leaves the local machine. */
  localOnlyNetwork: void;
};

/**
 * Entry point for all specs: import { test, expect } from '../../src/fixtures'.
 * Further fixtures (api client, fresh user, page objects) are added here as the suite grows.
 */
export const test = base.extend<GuardFixtures>({
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
