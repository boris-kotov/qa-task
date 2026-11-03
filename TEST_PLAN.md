# Test Plan — Toolshop release readiness (catalog → cart → checkout)

## 1. Objective
Answer one question: **can this build be released for the purchase flow?**
A customer must be able to find a product, put it into the cart with the right quantity and price,
and place an order that is recorded correctly (invoice with correct lines, quantities, total and payment method).

Build under test: `SPRINT=sprint5-with-bugs`, commit `ae7caecb`, local stand (see [README](README.md#environment)).

## 2. Sources of truth
| Source | Use |
|---|---|
| `docs/user-stories/v5.md` | Acceptance criteria (Product Overview, Product Detail, Checkout – Cart/Sign In/Billing/Payment, Invoices, Combination Discount) |
| `docs/features.md` | Which v5 features exist in the **with-bugs** build |
| `docs/gift-card-validation.md` | Gift card format rules — applicability to this build is questionable (Q2) |
| Swagger `http://localhost:8091/api/documentation` | API contract (`/products`, `/invoices`, `/payment/check`, `/users/*`) |
| Local stand | Actual behaviour. A divergence from docs is a defect candidate or a question, never a reason to bend a test |

## 3. Scope
### In scope
| Area | What |
|---|---|
| Catalog | Product grid, pagination; search (3–40 chars, resets filters); category filter incl. parent/child hierarchy; brand filter; combined filters; sorting ×4 (name A-Z/Z-A, price high-low/low-high); price range slider (default 1–100, max 200); out-of-stock indicator |
| Product detail | Name, price, description, badges; quantity selector (default 1, +/−, min 1, manual entry clamped 1..999,999,999); add to cart; out of stock → button disabled |
| Cart | Contents table, line totals and cart total; update quantity; delete item; empty cart message; proceed; combination discount 15% (rental + non-rental) |
| Checkout | Guest → sign-in step; already signed in message; billing address (required fields, max lengths, proceed disabled when invalid); payment methods (Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card) and their field validation; credit card expiry must be in the future; successful order → confirmation with invoice number, cart cleared |
| Order record | Invoice via API (`GET /invoices`, `GET /invoices/{id}`): lines, quantities, unit prices, total, payment method, billing address |
| Auth (supporting) | Registration (happy path, duplicate e-mail) and login as needed by the flows above; password strength UI is out |

### Out of scope
| Area | Reason |
|---|---|
| Admin, rentals (as a feature), contact form, favorites, profile, change password, chat widget, messages | Task scope. A rental product is used only as data for the combination discount (Q3) |
| 2FA/TOTP, social login, invoice PDF, multi-language, privacy page, product comparison | Not present in the with-bugs build (`features.md`) |
| Geo-location discount | Requires geolocation spoofing; P2, only if time remains |
| CO₂ sorting / eco filter | Present in UI, not in user stories; noted, not tested |
| Performance, security, accessibility | Not requested; obvious observations are recorded, no dedicated testing |
| Cross-browser, mobile | Chromium desktop only (time budget) |
| E-mail delivery of order confirmation | Q4 |

## 4. Risks
Likelihood (L) and impact (I) on a 1–3 scale; score = L × I. Priority: score ≥ 6 → P0, 3–4 → P1, ≤ 2 → P2.

| # | Area | Risk | L | I | Score | Priority | Mitigation |
|---|---|---|---|---|---|---|---|
| R1 | Order | Order total or invoice lines differ from the cart (price, quantity, missing line) | 2 | 3 | 6 | P0 | TC-023, TC-024, TC-026, TC-027, TC-028 |
| R2 | Order | Order cannot be placed with one of the payment methods | 2 | 3 | 6 | P0 | TC-023, TC-024 |
| R3 | Cart | Line total / cart total wrong after add, update or delete (cart is computed client-side) | 3 | 3 | 9 | P0 | TC-012, TC-013, TC-014, TC-015 |
| R4 | Order | Server trusts client-supplied `unit_price` / `total` in `POST /invoices` | 2 | 3 | 6 | P0 | TC-025 |
| R5 | Payment | Payment step does not match the advanced payment requirements (per-method fields and validation) or accepts empty / invalid data | 3 | 2 | 6 | P0 | TC-021, TC-022 |
| R6 | Checkout | Billing address validation missing or proceed allowed with invalid data | 2 | 2 | 4 | P1 | TC-020 |
| R7 | Catalog | Sorting returns wrong order (any position, not only the first item) | 2 | 2 | 4 | P1 | TC-001 |
| R8 | Catalog | Filters / search return products outside the selection or miss products | 2 | 2 | 4 | P1 | TC-002 – TC-007 |
| R9 | Product | Quantity boundaries (0, negative, > max) accepted or mishandled | 2 | 2 | 4 | P1 | TC-008, TC-009 |
| R10 | Checkout | Customer cannot get through sign-in / registration, or the cart is lost between steps (sessionStorage) | 2 | 2 | 4 | P1 | TC-017, TC-018, TC-019, TC-023, TC-029 |
| R11 | Order | Out-of-stock product can be added to cart or ordered via API | 2 | 2 | 4 | P1 | TC-010 (UI), TC-026 (API) |
| R12 | Cart | Combination discount (15%) not applied / not removed | 2 | 1 | 2 | P2 | TC-016 |

Test case details and AC traceability: [TEST_CASES.md](TEST_CASES.md).

## 5. Priorities
- **P0** — an order can be placed and is recorded correctly; the cart shows correct amounts; invalid payment data is rejected.
- **P1** — the customer can find products (search, filter, sort, price range); input validation in checkout and quantity.
- **P2** — discounts edge cases, UI texts, cosmetics.

## 6. Approach
| Level | Purpose | Tooling |
|---|---|---|
| API | Fast, deterministic checks of data correctness: catalog queries, order → invoice, payment/price validation | Playwright `APIRequestContext` + zod schemas |
| UI E2E | Critical path only: product → cart → checkout → confirmation, with the invoice checked via API | Playwright, `data-test` locators |
| Exploratory | Everything else in scope; observations become test cases or defects after reproduction | Playwright MCP against localhost |

Design rules that follow from the build:
- The cart has **no API** in this build (it lives in `sessionStorage['cart']`), so cart state is asserted in the UI
  (all lines and the total), not via `/carts`.
- Each autotest registers its own user via `POST /users/register`; the catalog comes from the seed.
  Demo accounts are not used (account locking).
- A defect found by an autotest keeps a strict assertion and is marked `test.fail` with the BUG ID.
- Checks of the order outcome go to the invoice, never stop at "a message is visible".

Techniques: equivalence partitioning and boundary values (quantity, search length, card number/CVV/expiry,
gift card length, address max lengths), decision table for payment method → required fields, state transitions
for the cart (empty → items → updated → deleted → empty).

## 7. Order of work and time budget (4 h total, deployment excluded)
| Step | Deliverable | Budget |
|---|---|---|
| 1 | TEST_PLAN.md (incl. quick UI recon) | 0:30 |
| 2 | TEST_CASES.md (15–30 cases, P0 first) + manual execution of non-automated cases | 1:00 |
| 3 | Autotests: API critical path (order → invoice, payment validation, sorting/filters) | 0:45 |
| 4 | Autotests: UI E2E critical path | 0:45 |
| 5 | BUGS.md with evidence | 0:30 |
| 6 | RELEASE.md, README, final run and report | 0:30 |

If time runs short: drop P2 first, then reduce UI coverage to one end-to-end order; never skip BUGS/RELEASE.

## 8. Entry and exit criteria
**Entry:** UI and API reachable on localhost; seed loaded (26 products, 12 categories, 10 brands); `npm run guard` passes.
**Exit:** all P0 cases executed; every case has a final status consistent with BUGS.md and the report;
autotests pass or fail as expected (`test.fail` for known defects); HTML report regenerated from the final commit;
release recommendation written.

## 9. Questions and assumptions
| # | Question | Assumption we proceed with |
|---|---|---|
| Q1 | v5 says the cart has server-side persistence; this build has no `/carts` API and keeps the cart in `sessionStorage`. Which is expected? | The with-bugs build intentionally uses the client-side cart. Not reported as a defect; cart persistence across browser sessions is not tested |
| Q2 | v5 Payment (Advanced) AC2–AC8 require per-method fields (bank, card, BNPL installments, gift card). This build's API takes only `payment_method`, `payment_account_name`, `payment_account_number` (Swagger), and `gift-card-validation.md` refers to code (`app/Payments/GiftCard.php`) that is absent. Is advanced payment required for this release? | v5 applies to the with-bugs build (`features.md` lists "Payment options (advanced)" for with-bugs). Missing per-method fields are reported as a defect after confirmation on the stand (TC-021). Card / gift card format validation is not tested if the fields do not exist |
| Q3 | Combination discount needs a rental item, but rentals are out of scope | A rental product is used only as test data for the discount; rental pages are not tested |
| Q4 | Should the confirmation e-mail (AC9) be verified? Mailcatcher runs locally | Not verified by default; P2, checked manually via mailcatcher only if time remains |
| Q5 | Currency and rounding of totals are not specified | USD, two decimals, line total = unit price × quantity, cart total = sum of line totals (before discounts) |
| Q6 | `POST /invoices` accepts `unit_price` and `total` from the client. Who is the source of truth for the price? | The server must use catalog prices; an invoice that stores a tampered price is a defect |
| Q7 | The payment dropdown in the UI also lists "Errror 304 - Missing Payment Gateway" (not in AC1) | Not an expected option; recorded as an observation to check during test case execution |
| Q8 | REG AC1 says "Postal code (numeric)". Many real postcodes are alphanumeric (NL `1011AA`, UK `SW1A 1AA`, CA `K1A 0B1`); the app accepts them. Is the requirement correct? | **Requirement defect candidate**: the AC looks wrong, the app behaviour is reasonable. Reported in BUGS.md under "Requirement issues", not as an application defect, until the requirement is clarified |
| Q9 | Registration rejects a date of birth that makes the customer younger than 18 ("Customer must be 18 years old."), but REG AC1 defines only the ISO format. Is 18+ a real business rule? The field also accepts a future date and fails only on submit | **Missing requirement**: the 18+ rule is treated as intended (it is plausible for the shop) but undocumented. The late validation (no `max` / no inline error for future or under-age dates) is reported as a usability suggestion, not a defect, because no AC covers it |
| Q10 | General: when an AC itself looks wrong or incomplete, how is it handled? | Behaviour that contradicts a **reasonable** AC is an application defect. When the AC is doubtful (contradicts common data formats, other ACs or `features.md`), the finding is recorded as a requirement issue with both readings and the chosen assumption; the release decision lists open requirement questions separately |
| Q11 | Registration rejects last names with an apostrophe or hyphen (O'Brien, Smith-Jones), but REG AC1 defines no format for names. Is this restriction intended? | **Undocumented validation**: treated as an open requirement question (real customers with such names cannot register). Autotests use letter-only names so the suite does not depend on the answer |
| Q12 | PD AC7 says the quantity is clamped to 1..999,999,999, but the app limits it to 99 with the message "You can order at most 99 of this product." | **Requirement issue**: the AC value looks unrealistic and the app has an explicit, communicated rule. Recorded as a question, not as a defect (former BUG-009) |

## 10. Quick recon notes (2026-11-03, Playwright MCP, localhost)
Read-only walk through home → product 1 → add to cart → checkout as guest. Nothing was submitted to the API.
These are **observations to verify** in test cases, not confirmed defects:
- Cart: line total shown as `$00.00` for 1 × $14.15 while the cart total is `$14.15`.
- Cart table headers: `Item, (empty), Quantity, Price, Total, Total` — AC1 expects an `Actions` column.
- Payment dropdown: the 5 methods from AC1 plus an extra "Errror 304 - Missing Payment Gateway".
- Payment step fields seen in DOM: `payment-method`, `account-name`, `account-number` (per-method fields not verified — login required).
- UI text typos: "Sorth", "Serch", "Contakt", "Reltded products"; the "Home" menu link points to `#/contact`.
- Sort options include CO₂ rating (not in stories); price slider shows 1–100 on a 0–200 scale.
- Product page: `data-test` attributes available (`quantity`, `increase-quantity`, `decrease-quantity`, `add-to-cart`, …);
  the +/− buttons have no accessible name.
- Not verified: the "Product added to shopping cart." message (not found when queried after the click).
- To learn checkout field names, the UI checkout template of the app was read (not the bug lists). Behaviour is
  confirmed only on the stand; the source is never used as evidence of a defect.

## 11. Environment
See [README](README.md#environment): macOS, Docker Compose source build, Node 24, Playwright Chromium.
UI `http://localhost:4200`, API `http://localhost:8091`. Data reset: `docker compose exec laravel-api php artisan migrate:fresh --seed`
(or `RESET_DB=true` for `globalSetup`). Only the local stand is used.
