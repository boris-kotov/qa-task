import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expectJson } from './client';
import { createdInvoice, invoice, invoicePage, loginResponse, product, productPage, user } from './schemas';
import type { CreatedInvoice, Invoice, Product, User } from './schemas';
import type { InvoicePayload, NewCustomer } from '../data/factories';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** POST /invoices rejects more than one of these per order ("You can only order one Thor Hammer.") — TEST_PLAN Q13. */
const PRODUCTS_LIMITED_PER_ORDER = ['Thor Hammer'];

/** Fixed test data of TC-014 / TC-023 (TEST_CASES.md). Random picks skip them so other tests do not use up their stock. */
const PRODUCTS_RESERVED_FOR_FIXED_TESTS = ['Combination Pliers', 'Pliers', 'Slip Joint Pliers'];

/** Endpoint methods of the Toolshop REST API used by the suite (Swagger: /api/documentation). */
export class ToolshopApi {
  constructor(private readonly request: APIRequestContext) {}

  async register(customer: NewCustomer): Promise<User> {
    return expectJson(await this.request.post('/users/register', { data: customer }), 201, user);
  }

  async login(email: string, password: string): Promise<string> {
    const body = await expectJson(await this.request.post('/users/login', { data: { email, password } }), 200, loginResponse);
    return body.access_token;
  }

  async product(id: number): Promise<Product> {
    return expectJson(await this.request.get(`/products/${id}`), 200, product);
  }

  /** All products of a listing endpoint, following pagination. */
  async allProducts(path = '/products', query: Record<string, string> = {}): Promise<Product[]> {
    const products: Product[] = [];
    for (let page = 1; ; page++) {
      const pageBody = await expectJson(await this.request.get(path, { params: { ...query, page: String(page) } }), 200, productPage);
      products.push(...pageBody.data);
      if (page >= pageBody.last_page) return products;
    }
  }

  /**
   * Orders decrement stock, so tests must not hard-code products (they would run out under --repeat-each).
   * Picks `count` distinct regular products with at least `minStock` items, randomly to spread parallel load.
   * Products with an undocumented per-order limit are skipped, because tests order quantity 2.
   */
  async pickInStockProducts(count: number, minStock = 5): Promise<Product[]> {
    const candidates = (await this.allProducts()).filter(
      (product) =>
        !product.is_rental &&
        (product.stock ?? 0) >= minStock &&
        !PRODUCTS_LIMITED_PER_ORDER.includes(product.name) &&
        !PRODUCTS_RESERVED_FOR_FIXED_TESTS.includes(product.name),
    );
    if (candidates.length < count) {
      throw new Error(`Only ${candidates.length} products have stock >= ${minStock}. Reset the DB (RESET_DB=true).`);
    }
    // Random order: parallel tests then rarely pick the same product, so stock is consumed evenly.
    return candidates.sort(() => Math.random() - 0.5).slice(0, count);
  }

  /** Raw response: negative tests assert the status themselves. */
  async createInvoice(token: string | null, payload: Partial<InvoicePayload>): Promise<APIResponse> {
    return this.request.post('/invoices', { data: payload, headers: token ? bearer(token) : {} });
  }

  async createInvoiceOk(token: string, payload: InvoicePayload): Promise<CreatedInvoice> {
    return expectJson(await this.createInvoice(token, payload), 201, createdInvoice);
  }

  async invoice(token: string, id: number): Promise<Invoice> {
    return expectJson(await this.request.get(`/invoices/${id}`, { headers: bearer(token) }), 200, invoice);
  }

  /** Raw response: access tests assert the status themselves. */
  async invoiceResponse(token: string, id: number): Promise<APIResponse> {
    return this.request.get(`/invoices/${id}`, { headers: bearer(token) });
  }

  /** All invoices returned to this user (all pages). */
  async invoices(token: string): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    for (let page = 1; ; page++) {
      const pageBody = await expectJson(await this.request.get('/invoices', { headers: bearer(token), params: { page: String(page) } }), 200, invoicePage);
      invoices.push(...pageBody.data);
      if (page >= pageBody.last_page) return invoices;
    }
  }

  /**
   * Invoices that belong to the user. GET /invoices also returns other users' invoices (BUG-001),
   * so ownership is filtered explicitly.
   */
  async ownInvoices(token: string, userId: number): Promise<Invoice[]> {
    return (await this.invoices(token)).filter((invoice) => invoice.user_id === userId);
  }
}
