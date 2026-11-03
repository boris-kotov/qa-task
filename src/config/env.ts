import 'dotenv/config';
import { z } from 'zod';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

const localUrl = z
  .string()
  .url()
  .refine((value) => LOCAL_HOSTS.includes(new URL(value).hostname), {
    message: 'Only the local Toolshop instance is allowed (localhost / 127.0.0.1). The public stand is forbidden by the task.',
  });

const schema = z.object({
  BASE_URL: localUrl.default('http://localhost:4200'),
  API_URL: localUrl.default('http://localhost:8091'),
  APP_DIR: z.string().default('../toolshop-app'),
  RESET_DB: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  TEST_USER_PASSWORD: z.string().min(8).default('ChangeMe-Str0ng!pass'),
  DEMO_CUSTOMER_EMAIL: z.string().email().optional(),
  DEMO_CUSTOMER_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid test environment configuration:\n${details}`);
}

export const env = parsed.data;
export const isLocalHost = (hostname: string): boolean => LOCAL_HOSTS.includes(hostname);
