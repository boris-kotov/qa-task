import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { env } from '../config/env';
import type { Product } from '../api/schemas';

export type NewCustomer = {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
  phone: string;
  dob: string;
  email: string;
  password: string;
};

/** Fixed billing address: valid for the checkout form (city ≥ 6 chars, see TC-020) and easy to assert on the invoice. */
export const billingAddress = {
  address: 'Main Street 1',
  city: 'Amsterdam',
  state: 'Noord-Holland',
  country: 'Netherlands',
  postcode: '1011AA',
} as const;

export function newCustomer(): NewCustomer {
  return {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    ...billingAddress,
    phone: '0612345678',
    dob: '1990-01-01',
    email: `qa.${randomUUID()}@example.test`,
    password: env.TEST_USER_PASSWORD,
  };
}

export type OrderItem = { product: Product; quantity: number };

/** Money with two decimals as the shop shows it: round half up on cents. */
export const toCents = (amount: number): number => Math.round(amount * 100);

export const orderTotal = (items: OrderItem[]): number =>
  items.reduce((sum, { product, quantity }) => sum + toCents(product.price) * quantity, 0) / 100;

export type InvoicePayload = {
  user_id: number;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postcode: string;
  payment_method: string;
  payment_account_name: string;
  payment_account_number: string;
  total: number;
  invoice_items: { product_id: number; quantity: number; unit_price: number }[];
};

/** Payload as the UI sends it (checkout.component.ts → POST /invoices), with catalog prices. */
export function invoicePayload(userId: number, items: OrderItem[], overrides: Partial<InvoicePayload> = {}): InvoicePayload {
  return {
    user_id: userId,
    billing_address: billingAddress.address,
    billing_city: billingAddress.city,
    billing_state: billingAddress.state,
    billing_country: billingAddress.country,
    billing_postcode: billingAddress.postcode,
    payment_method: 'Cash on Delivery',
    payment_account_name: 'Test Customer',
    payment_account_number: '1234567890',
    total: orderTotal(items),
    invoice_items: items.map(({ product, quantity }) => ({ product_id: product.id, quantity, unit_price: product.price })),
    ...overrides,
  };
}
