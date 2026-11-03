import { z } from 'zod';

/** Response schemas for the endpoints the suite uses. Only fields the tests rely on are declared. */

export const loginResponse = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number(),
});

export const user = z.object({
  id: z.number().int(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
});

export const product = z.object({
  id: z.number().int(),
  name: z.string(),
  price: z.number(),
  stock: z.number().int().nullable(),
  is_rental: z.union([z.boolean(), z.number()]).transform(Boolean),
  category_id: z.number().int(),
  brand_id: z.number().int(),
});

export const productPage = z.object({
  current_page: z.number().int(),
  last_page: z.number().int(),
  per_page: z.number().int(),
  total: z.number().int(),
  data: z.array(product),
});

export const invoiceLine = z.object({
  product_id: z.number().int(),
  quantity: z.number().int(),
  unit_price: z.number(),
});

/** POST /invoices returns the invoice without lines. */
export const createdInvoice = z.object({
  id: z.number().int(),
  user_id: z.number().int(),
  invoice_number: z.string().regex(/^INV-\d+$/),
  total: z.number(),
  payment_method: z.string(),
});

export const invoice = createdInvoice.extend({
  billing_address: z.string(),
  billing_city: z.string(),
  billing_state: z.string(),
  billing_country: z.string(),
  // Seeded invoices return numeric postcodes (e.g. 72764), new ones return strings.
  billing_postcode: z.union([z.string(), z.number()]).transform(String),
  invoicelines: z.array(invoiceLine),
});

export const invoicePage = z.object({
  total: z.number().int(),
  last_page: z.number().int(),
  data: z.array(invoice),
});

export type LoginResponse = z.infer<typeof loginResponse>;
export type User = z.infer<typeof user>;
export type Product = z.infer<typeof product>;
export type ProductPage = z.infer<typeof productPage>;
export type CreatedInvoice = z.infer<typeof createdInvoice>;
export type Invoice = z.infer<typeof invoice>;
