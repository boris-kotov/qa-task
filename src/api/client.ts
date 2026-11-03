import type { APIResponse } from '@playwright/test';
import type { z } from 'zod';
import { expect } from '@playwright/test';

/**
 * Asserts the HTTP status (the response body is included in the failure message)
 * and parses the JSON body with a zod schema. Business assertions are done on the parsed value.
 */
export async function expectJson<T extends z.ZodType>(response: APIResponse, status: number, schema: T): Promise<z.infer<T>> {
  const text = await response.text();
  expect(response.status(), `${response.url()} → ${response.status()}: ${text.slice(0, 500)}`).toBe(status);
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Response of ${response.url()} does not match the schema:\n${parsed.error.message}\nBody: ${text.slice(0, 500)}`);
  }
  return parsed.data;
}
