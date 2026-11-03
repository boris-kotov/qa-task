# Bugs — Toolshop (purchase flow)

**Version for every defect:** `SPRINT=sprint5-with-bugs`, app commit `ae7caecb`, local stand (UI `http://localhost:4200`,
API `http://localhost:8091`), Chromium via Playwright 1.64.1 (autotests and Playwright MCP); some defects also confirmed by
the author in a regular desktop browser. Data: `migrate:fresh --seed` + fresh customers registered via API/UI.

Every defect below was reproduced on the local stand. Evidence paths are relative to `reports/evidence/`; autotest
results are in the HTML report `reports/html` (expected failures are listed in [README](README.md#expected-failures-defects)).
Requirement problems are **not** counted as defects — see [Requirement issues](#requirement-issues-not-application-defects).

**Severity:** Critical — data leak, wrong money, purchase impossible · Major — wrong order/cart result or a core feature
broken without a reasonable workaround · Minor — wrong behaviour with a workaround, or misleading UI · Trivial — text/label.
**Priority:** Highest — fix before release · High — fix in this release · Medium — next release · Low — backlog.

## Summary
| ID | Title | Severity | Priority | Blocker | TC | Autotest |
|---|---|---|---|---|---|---|
| [BUG-001](#bug-001) | Any customer can read all other customers' invoices | Critical | Highest | yes | TC-028 | api/invoice-access › TC-028 |
| [BUG-017](#bug-017) | Server stores the unit price and total sent by the client | Critical | Highest | yes | TC-025 | api/orders › TC-025 |
| [BUG-003](#bug-003) | Payment step has no method-specific fields (card, BNPL, gift card…) | Critical | Highest | yes | TC-021 | — |
| [BUG-002](#bug-002) | Double Confirm creates two orders with the same invoice number | Major | High | yes | TC-027 | — |
| [BUG-004](#bug-004) | Invalid payment method accepted ("Errror 304", any string via API) | Major | High | yes | TC-022, TC-026 | api/orders › TC-026 (unknown method) |
| [BUG-005](#bug-005) | Adding a product already in the cart replaces its quantity | Major | High | yes | TC-013 | ui/cart › TC-013 |
| [BUG-019](#bug-019) | Orders are accepted beyond stock; stock becomes negative | Major | High | yes | TC-026 | api/orders › TC-026 (out of stock) |
| [BUG-013](#bug-013) | Valid short city names are rejected at checkout ("Oslo") | Major | High | yes | TC-020 | — |
| [BUG-020](#bug-020) | Sort "Price (Low - High)" shows prices from high to low | Major | Medium | no | TC-001 | ui/catalog › TC-001 |
| [BUG-010](#bug-010) | Price range filter is not applied | Major | Medium | no | TC-006 | — |
| [BUG-011](#bug-011) | Combination discount (rental + non-rental, 15%) is not applied | Major | Medium | no | TC-016 | — |
| [BUG-021](#bug-021) | Order total is truncated (−1 cent) in the cart **and on the invoice** | Major | High | yes | TC-014, TC-023 | — (found by TC-014 / TC-023 with random data) |
| [BUG-029](#bug-029) | A rejected order shows no error — Confirm silently does nothing | Major | Medium | no | TC-023 | — (found by TC-023) |
| [BUG-027](#bug-027) | Search with parentheses returns HTTP 500 | Major | Medium | no | TC-003 | — |
| [BUG-018](#bug-018) | Order lines with quantity 0 are accepted (API and UI) | Major | Medium | no | TC-026, TC-015 | api/orders › TC-026 (quantity 0) |
| [BUG-006](#bug-006) | Cart line total shows $00.00 | Minor | Medium | no | TC-012 | — |
| [BUG-007](#bug-007) | Add to cart shows "Oeps, something went wrong." although the item is added | Minor | Medium | no | TC-012 | — |
| [BUG-008](#bug-008) | Quantity +/− buttons on the product page do nothing | Minor | Medium | no | TC-008 | — |
| [BUG-012](#bug-012) | Billing postcode is pre-filled with "missing value" | Minor | Medium | no | TC-020 | — |
| [BUG-015](#bug-015) | Duplicate e-mail on registration shows a "password hint" message | Minor | Medium | no | TC-029 | — |
| [BUG-028](#bug-028) | Search with a hyphen returns wrong products | Minor | Medium | no | TC-003 | — |
| [BUG-023](#bug-023) | Delete button in the cart does nothing | Minor | Medium | no | TC-015 | — |
| [BUG-025](#bug-025) | Main menu "Home" opens the Contact page | Minor | Medium | no | TC-011 | — |
| [BUG-014](#bug-014) | No checkbox for parent categories (Hand Tools, Power Tools) | Minor | Low | no | TC-004 | — |
| [BUG-024](#bug-024) | Billing address max lengths are not enforced | Minor | Low | no | TC-020 | — |
| [BUG-016](#bug-016) | Cart actions column is titled "Total" instead of "Actions" | Trivial | Low | no | TC-012 | — |
| [BUG-022](#bug-022) | No "Product quantity updated." message after changing a quantity | Trivial | Low | no | TC-014 | ui/cart › TC-014 |
| [BUG-026](#bug-026) | UI typos: "Sorth", "Serch", "Contakt", "Reltded products", "Errror 304" | Trivial | Low | no | TC-011 | — |

BUG-009 is not used: the quantity limit of 99 turned out to be an explicit rule with a message and was moved to
requirement issue [Q12](#requirement-issues-not-application-defects).

---

## Critical

### BUG-001
**Any customer can read all other customers' invoices**
- **Impact:** a logged-in customer sees every customer's invoices — billing address, payment method, payment account number, order lines. Personal and payment data leak.
- **Severity / Priority:** Critical / Highest — data exposure of all customers; trivially exploitable with any account. **Release blocker.**
- **Reproducibility:** always — manual API 1/1; autotest TC-028 fails as expected on every run (incl. `--repeat-each=5`).
- **Preconditions:** two customers A and B; A has at least one order.
- **Steps:**
  1. Log in as B (`POST /users/login`), take the token.
  2. `GET /invoices` with B's token.
  3. `GET /invoices/{id}` of A's invoice with B's token.
- **Expected:** step 2 returns only B's invoices; step 3 returns 403/404 (INV AC1, AC3).
- **Actual:** step 2 returns invoices of other users (`user_id` 2, 3, …) with addresses and account numbers; step 3 returns 200 with A's invoice.
- **Evidence:** `TC-028-invoices-of-other-users.txt`; autotest report.
- **Related:** TC-028 · `tests/api/invoice-access.spec.ts › TC-028 a customer cannot see invoices of another customer`.

### BUG-017
**The server stores the unit price and the total sent by the client**
- **Impact:** a customer (or any script) can buy any product for any price; revenue loss.
- **Severity / Priority:** Critical / Highest — direct financial loss, no server-side price check. **Release blocker.**
- **Reproducibility:** always — autotest TC-025, every run.
- **Preconditions:** logged-in customer; product with catalog price P (e.g. Bolt Cutters $48.41).
- **Steps:**
  1. `POST /invoices` with `invoice_items: [{product_id, quantity: 1, unit_price: 0.01}]`, `total: 0.01`.
  2. `GET /invoices/{id}`.
- **Expected:** request rejected (4xx), or the invoice uses the catalog price P (TEST_PLAN Q6).
- **Actual:** 201; the invoice stores `unit_price` 0.01 and total 0.01.
- **Evidence:** autotest report (TC-025: "Expected value: 0.01, Received array: ['rejected', 48.41]").
- **Related:** TC-025 · `tests/api/orders.spec.ts › Orders via API › TC-025 …`.

### BUG-003
**The payment step has no method-specific fields**
- **Impact:** for Bank Transfer, Credit Card, Buy Now Pay Later and Gift Card the customer cannot enter the required payment data; every method (even Cash on Delivery) asks for "Account name" and "Account number" only. Payment for 4 of 5 methods cannot be captured or validated.
- **Severity / Priority:** Critical / Highest — "checkout with payment methods" is the core of the release scope; PAY AC2–AC8 are not implemented (`features.md` lists advanced payment options for with-bugs). **Release blocker.**
- **Reproducibility:** always — manual 1/1 (all 6 options inspected).
- **Preconditions:** signed-in customer, cart with any product, billing address filled.
- **Steps:** at the payment step select each method in turn.
- **Expected:** Bank Transfer → bank name, account name, account number; Credit Card → card number (XXXX-XXXX-XXXX-XXXX), expiry (MM/YYYY), CVV, holder; BNPL → "Monthly installments" 3/6/9/12; Gift Card → number + validation code; Cash on Delivery → no fields; switching method resets the form (PAY AC2–AC8).
- **Actual:** the same two required fields "Account name" and "Account number" for every method.
- **Evidence:** `TC-021-credit-card-fields.png`.
- **Related:** TC-021 · not automated.

## Major

### BUG-002
**Double click on Confirm creates two orders with the same invoice number**
- **Impact:** the customer is charged twice; two invoices share one number (accounting and support cannot tell them apart).
- **Severity / Priority:** Major / High — duplicate orders on a common user action; invoice numbers are not unique. **Release blocker.**
- **Reproducibility:** UI double click 1/1; API concurrency: 18 of 20 pairs of simultaneous `POST /invoices` got the same invoice number (not deterministic → not automated).
- **Preconditions:** signed-in customer at the payment step, Cash on Delivery, account fields filled, "Payment was successful" shown after the first Confirm.
- **Steps:** double-click Confirm; `GET /invoices` for the customer.
- **Expected:** exactly one order; invoice numbers are unique.
- **Actual:** two invoices (ids 12 and 13) with the same number INV-2026000006, same lines and total.
- **Evidence:** `TC-027-double-click-two-invoices.txt`, `TC-027-concurrent-orders-spike.txt`.
- **Related:** TC-027 · not automated (reason in TEST_CASES).

### BUG-004
**An invalid payment method is accepted and the order is created**
- **Impact:** orders are placed with a payment method that does not exist ("error"); the UI even offers it and reports "Payment was successful".
- **Severity / Priority:** Major / High — orders without a valid payment reach fulfilment (`AWAITING_FULFILLMENT`). **Release blocker.**
- **Reproducibility:** always — UI 1/1; autotest TC-026 (unknown method) every run.
- **Steps (UI):** at the payment step select "Errror 304 - Missing Payment Gateway", fill the account fields, Confirm twice.
  **Steps (API):** `POST /invoices` with `payment_method: "Missing Payment Gateway"`.
- **Expected:** the option is not offered (PAY AC1 lists 5 methods); the API rejects unknown methods with 422.
- **Actual:** UI: "Payment was successful", invoice INV-2026000005 stored with `payment_method: "error"`. API: 201, invoice created.
- **Evidence:** `TC-022-error-304-payment-successful.png`, `TC-022-order-with-error-304-method.txt`; autotest report.
- **Related:** TC-022, TC-026 · `tests/api/orders.spec.ts › … TC-026 order with an unknown payment method …`.

### BUG-005
**Adding a product that is already in the cart replaces its quantity**
- **Impact:** the customer orders fewer items than intended (adds 1 + 1, gets 1); combined with BUG-007 ("something went wrong" after adding) customers are likely to click again.
- **Severity / Priority:** Major / High — silently wrong order content. **Release blocker.**
- **Reproducibility:** always — manual 2/2; autotest TC-013 every run.
- **Preconditions:** empty cart.
- **Steps:** open Combination Pliers ($14.15), quantity 1, Add to cart; click Add to cart again.
- **Expected:** one cart line with quantity 2, total $28.30 (PD AC8, CART AC1).
- **Actual:** quantity stays 1, total $14.15; earlier: 2 + 1 → 1.
- **Evidence:** `TC-013-same-product-twice.md`; autotest report.
- **Related:** TC-013 · `tests/ui/cart.spec.ts › Cart › TC-013 …`.

### BUG-019
**Orders are accepted beyond stock; stock becomes negative**
- **Impact:** out-of-stock products are sold (overselling); stock values become negative.
- **Severity / Priority:** Major / High — orders that cannot be fulfilled. **Release blocker.** The UI blocks Add to cart for stock 0, but the API does not check stock at all.
- **Reproducibility:** always — autotest TC-026 (out of stock) every run; TC-027 spike: 41 orders for a product with stock 11.
- **Steps:** `POST /invoices` for Long Nose Pliers (stock 0), quantity 1; `GET /products/4`.
- **Expected:** 422, no invoice; stock unchanged.
- **Actual:** 201, invoice created; stock 0 → −1. Sheet Sander: stock 11 → −30 after 41 orders.
- **Evidence:** `TC-027-concurrent-orders-spike.txt`; autotest report.
- **Related:** TC-026 · `tests/api/orders.spec.ts › … TC-026 order with a product that is out of stock …`.

### BUG-013
**Valid short city names are rejected at checkout**
- **Impact:** customers from cities with fewer than 6 letters (Oslo, Rome, Bonn, Lima…) cannot proceed to payment.
- **Severity / Priority:** Major / High — purchase impossible for a group of customers, no workaround. **Release blocker.**
- **Reproducibility:** always — manual 2/2 (before and after DB reset).
- **Preconditions:** signed-in customer at the billing address step.
- **Steps:** enter City "Oslo", fill the other fields.
- **Expected:** City is valid (BA AC1: required, max 40 characters); Proceed enabled.
- **Actual:** City is marked invalid, Proceed stays disabled ("Ams" — 3 chars — also rejected; "Amsterdam" accepted).
- **Evidence:** `TC-020-city-oslo-rejected.png`.
- **Related:** TC-020 · not automated.

### BUG-020
**Sort "Price (Low - High)" shows prices from high to low**
- **Impact:** customers looking for the cheapest products get the most expensive first.
- **Severity / Priority:** Major / Medium — core catalog function returns the opposite order; customers can still browse.
- **Reproducibility:** always — autotest TC-001 every run.
- **Steps:** open the catalog, select "Price (Low - High)", go through pages 1–3.
- **Expected:** all 26 products in ascending price order (PO AC9).
- **Actual:** exactly descending ($125.23 … $4.92). The option's value is `price,desc` (label and value are swapped).
- **Evidence:** autotest report (TC-001 diff of all 26 prices).
- **Related:** TC-001 · `tests/ui/catalog.spec.ts › TC-001 …`. Name sorting was not verified (see assumptions).

### BUG-010
**The price range filter is not applied**
- **Impact:** customers cannot limit products by budget.
- **Severity / Priority:** Major / Medium — feature in scope (PO AC11) does nothing; workaround: sort/browse.
- **Reproducibility:** always — manual 2/2 (ranges 13–14 and 0–1).
- **Steps:** on the catalog move the slider handles (e.g. to 13 and 14).
- **Expected:** only products with 13 ≤ price ≤ 14 (ids 6, 18).
- **Actual:** the grid is unchanged ($9.17, $48.41 …). The UI requests `/products?between=price,13` — the upper bound is missing; the API returns the correct result for `between=price,13,14`.
- **Evidence:** `TC-006-price-range-request.txt`.
- **Related:** TC-006 · not automated.

### BUG-011
**Combination discount is not applied**
- **Impact:** customers combining rental and regular products pay 15% more than the requirement promises.
- **Severity / Priority:** Major / Medium — wrong price vs CART AC7 / CD AC1; rentals themselves are out of scope, so lower priority.
- **Reproducibility:** manual 1/1.
- **Steps:** add Combination Pliers ($14.15) and the rental Excavator ($136.50); open the cart.
- **Expected:** subtotal $150.65, discount 15% ($22.60), total $128.05.
- **Actual:** total $150.65, no subtotal/discount rows.
- **Evidence:** `TC-016-no-combination-discount.png`.
- **Related:** TC-016 · not automated.

### BUG-021
**Order total is truncated instead of rounded — in the cart and on the invoice**
- **Impact:** for some price combinations the cart shows and the UI **sends** a total 1 cent lower than the sum of the lines; the server stores it (BUG-017), so the invoice total differs from its own lines.
- **Severity / Priority:** Major / High — wrong money in financial records (small amount, but the invoice is internally inconsistent). **Release blocker** together with BUG-017.
- **Reproducibility:** deterministic for the data below; found twice by autotests with random products (TC-014 cart total, TC-023 invoice).
- **Steps (cart):** add Cordless Drill 18V ($119.24) and Pliers ($12.01); in the cart set the drill quantity to 3.
  **Steps (order):** order 2 × Sledgehammer ($17.75) + 1 × Open-end Spanners (Set) ($38.51) through the UI.
- **Expected:** cart $369.73; invoice total $74.01 = sum of its lines.
- **Actual:** cart $369.72; the UI sends `"total": 74` and invoice INV-2026000042 stores 74.00 while its lines sum to 74.01. JavaScript float sums (369.72999…, 74.00999…) are cut instead of rounded.
- **Evidence:** `BUG-021-cart-total-truncated-369.72.png`, `BUG-021-cart-total-truncated.txt` (incl. the order request/response).
- **Related:** TC-014, TC-023 (both now use documented data that is not affected) · not automated as a separate test.

### BUG-029
**A rejected order shows no error — Confirm silently does nothing**
- **Impact:** when the API rejects an order, the customer sees "Payment was successful" and the Confirm button, but no error and no order; they cannot tell what went wrong.
- **Severity / Priority:** Major / Medium — silent failure on the last checkout step; triggered by any rejected order (observed with the per-order limit, Q13).
- **Reproducibility:** UI 1/1 (autotest run); the API rejection is deterministic: `POST /invoices` with 2 × Thor Hammer → 400 "You can only order one Thor Hammer.".
- **Steps:** add Thor Hammer × 2 to the cart, check out with Cash on Delivery, click Confirm twice.
- **Expected:** a clear error message (e.g. the API text) and a way to fix the cart.
- **Actual:** POST /invoices → 400 `{"message":"You can only order one Thor Hammer."}`; the page stays on the payment step without any message.
- **Evidence:** `BUG-029-order-rejected-no-message.png`, `BUG-029-order-rejected-no-message.txt`.
- **Related:** TC-023 (found when a random pick chose Thor Hammer) · not automated.

### BUG-027
**Search with parentheses returns HTTP 500**
- **Impact:** searching for a product by its full name, e.g. "Open-end Spanners (Set)", fails; the customer gets no results.
- **Severity / Priority:** Major / Medium — server error on ordinary input in a core catalog function; searching for one word still works.
- **Reproducibility:** always — API 2/2, UI 1/1.
- **Steps:** `GET /products/search?q=Spanners (Set)` (or search "Open-end Spanners (Set)" in the UI).
- **Expected:** 200 with the matching product (PO AC4). **Actual:** HTTP 500 `{"message":"Something went wrong"}`; the UI shows no product.
- **Evidence:** `BUG-027-028-search-special-chars.txt`, `BUG-027-028-ui-search-full-name.png`.
- **Related:** TC-003 (parentheses were not in the original test data; found by TC-023 with a random product).

### BUG-018
**Order lines with quantity 0 are accepted**
- **Impact:** invoices contain lines with quantity 0; reachable from the UI by the delete workaround (BUG-023).
- **Severity / Priority:** Major / Medium — corrupt order data; no money impact (line total 0).
- **Reproducibility:** always — autotest TC-026 (quantity 0) every run; UI 1/1.
- **Steps (API):** `POST /invoices` with a line of quantity 0. **Steps (UI):** add two products, set one quantity to 0 in the cart, check out.
- **Expected:** 422 (API); a quantity-0 line is removed from the cart and never sent.
- **Actual:** 201; UI order INV-2026000010 has lines (product 1 × 0 @ 14.15) and (product 2 × 1 @ 12.01).
- **Evidence:** `BUG-023-workaround-qty0-order.txt`, `BUG-023-workaround-qty0-line-stays.png`; autotest report.
- **Related:** TC-026, TC-015 · `tests/api/orders.spec.ts › … TC-026 order with quantity 0 …`.

## Minor

### BUG-006
**Cart line total shows $00.00**
- **Impact:** the customer cannot check each line; looks like items are free.
- **Severity / Priority:** Minor / Medium — the cart total is correct.
- **Reproducibility:** always — seen in every cart view (5+ times, before and after DB reset).
- **Steps:** add Combination Pliers × 2; open the cart.
- **Expected:** line total $28.30 (CART AC1). **Actual:** $00.00.
- **Evidence:** `TC-012-cart-line-total-zero.png`.
- **Related:** TC-012.

### BUG-007
**"Oeps, something went wrong." after Add to cart**
- **Impact:** the item is added, but the customer is told it failed → likely to add again (and then hit BUG-005).
- **Severity / Priority:** Minor / Medium — misleading message on the main action.
- **Reproducibility:** always — 3/3 (before and after DB reset).
- **Steps:** product page → Add to cart.
- **Expected:** "Product added to shopping cart." (PD AC8). **Actual:** "Oeps, something went wrong."; the cart contains the item.
- **Evidence:** `TC-012-add-to-cart-error-message.png`.
- **Related:** TC-012.

### BUG-008
**Quantity +/− buttons on the product page do nothing**
- **Impact:** customers must type the quantity.
- **Severity / Priority:** Minor / Medium — manual entry works.
- **Reproducibility:** always — 3/3 clicks (+, +, −).
- **Steps:** product page, quantity 1, click + twice; set 3, click −.
- **Expected:** 1 → 3; 3 → 2 (PD AC4, AC5). **Actual:** 1 stays 1; 3 stays 3.
- **Evidence:** `TC-008-quantity-buttons-no-effect.png`.
- **Related:** TC-008.

### BUG-012
**Billing postcode is pre-filled with "missing value"**
- **Impact:** the customer must notice and retype the postcode; otherwise the invoice gets "missing value".
- **Severity / Priority:** Minor / Medium — pre-fill of other fields works.
- **Reproducibility:** always — 2/2 customers (before and after DB reset).
- **Steps:** customer registered with postcode 1011AA; checkout → address step.
- **Expected:** postcode 1011AA (BA AC4; `GET /users/me` returns 1011AA). **Actual:** "missing value".
- **Evidence:** `TC-020-postcode-prefill-missing-value.png`, `TC-020-users-me-address.txt`.
- **Related:** TC-020.

### BUG-015
**Duplicate e-mail on registration shows a "password hint" message**
- **Impact:** wrong and confusing text; no password hint is ever entered at registration; the message also confirms the account exists.
- **Severity / Priority:** Minor / Medium — UI/text defect (author's assessment); registration itself works.
- **Reproducibility:** always — UI 1/1, API 2/2.
- **Steps:** register with an e-mail that is already registered.
- **Expected:** "Email is already in use." (REG AC5). **Actual:** "User already registered - Your password hint is: Name of your cat!" (API 409 with the same text).
- **Evidence:** `TC-029-duplicate-email-ui-password-hint.png`, `TC-029-duplicate-email-response.txt`.
- **Related:** TC-029.

### BUG-028
**Search with a hyphen returns wrong products**
- **Impact:** "Open-end" finds Long Nose Pliers and Excavator but not "Open-end Spanners (Set)".
- **Severity / Priority:** Minor / Medium — other words of the name work ("Spanners", "end").
- **Reproducibility:** always — API 2/2.
- **Steps:** `GET /products/search?q=Open-end`.
- **Expected:** products whose name contains "Open-end" (PO AC4). **Actual:** 2 unrelated products; the product itself is missing.
- **Evidence:** `BUG-027-028-search-special-chars.txt`.
- **Related:** TC-003.

### BUG-023
**Delete button in the cart does nothing**
- **Impact:** an item added by mistake cannot be removed.
- **Severity / Priority:** Minor / Medium — workaround: set its quantity to 0 (the line stays and is sent as a 0-quantity line, BUG-018).
- **Reproducibility:** always — Playwright MCP 2/2, author in a regular browser (signed-in customer).
- **Steps:** cart with Combination Pliers and Pliers (total $26.16); click the red delete button of Combination Pliers.
- **Expected:** the line is removed, total $12.01; deleting the last line shows "Your shopping cart is empty" (CART AC3, AC4).
- **Actual:** nothing changes (UI, total, sessionStorage).
- **Evidence:** `TC-015-delete-has-no-effect.png`, `BUG-023-workaround-qty0-line-stays.png`.
- **Related:** TC-015.

### BUG-025
**Main menu "Home" opens the Contact page**
- **Impact:** customers cannot get back to the catalog via the menu (the logo still works).
- **Severity / Priority:** Minor / Medium — global navigation broken; workaround: logo / browser back.
- **Reproducibility:** always — 2/2 (`href="#/contact"`).
- **Steps:** click "Home" in the main menu. **Expected:** catalog (home page). **Actual:** Contact page (`#/contact`).
- **Evidence:** `BUG-025-home-link-opens-contact.png`.
- **Related:** TC-011 (observation).

### BUG-014
**No checkbox for parent categories**
- **Impact:** customers cannot select a whole category group at once.
- **Severity / Priority:** Minor / Low — children can be checked one by one; child filters work correctly.
- **Reproducibility:** always — 2/2.
- **Steps:** catalog sidebar, "By category".
- **Expected:** a checkbox for "Hand Tools" / "Power Tools" that checks all children (PO AC6). **Actual:** parents are plain text.
- **Evidence:** `TC-004-no-parent-category-checkbox.png`.
- **Related:** TC-004.

### BUG-024
**Billing address max lengths are not enforced**
- **Impact:** over-long values reach the invoice.
- **Severity / Priority:** Minor / Low — no customer blocked.
- **Reproducibility:** manual 1/1.
- **Steps:** at the address step enter street 71, state 41, country 41, postcode 11 characters.
- **Expected:** values limited to 70/40/40/10 or marked invalid (BA AC1). **Actual:** accepted, Proceed enabled (city 41 is rejected correctly).
- **Evidence:** `BUG-024-address-max-length.txt`.
- **Related:** TC-020.

## Trivial

### BUG-016
**Cart actions column is titled "Total"** — the table has headers Item, (empty), Quantity, Price, Total, **Total**; the last column contains the delete button. Expected "Actions" (CART AC1). Trivial / Low. Always (5+ views). Evidence: `TC-012-cart-line-total-zero.png`. TC-012.

### BUG-022
**No "Product quantity updated." message** — after changing a quantity in the cart the totals update correctly, but no confirmation is shown (CART AC2). Trivial / Low. Always — autotest TC-014 every run (`tests/ui/cart.spec.ts › Cart › TC-014 …`; totals are asserted before the message and pass). Evidence: autotest report.

### BUG-026
**UI typos** — "Sorth" (sort heading), "Serch" (search button), "Contakt" (menu), "Reltded products" (product page), "Errror 304" (payment option). Trivial / Low. Always — 2/2. Evidence: `BUG-026-typos-home-sidebar.png`, `TC-022-error-304-payment-successful.png`. TC-011 (observation).

---

## Requirement issues (not application defects)
Agreed rule: behaviour that contradicts a reasonable AC is a defect; when the AC itself is doubtful, it is a question to the
requirement owner. Details and the assumptions used for testing are in [TEST_PLAN.md](TEST_PLAN.md#9-questions-and-assumptions).

| # | Requirement says | App does | Question |
|---|---|---|---|
| Q1 | Sprint 5 cart has server-side persistence | Cart lives only in `sessionStorage` (no `/carts` API); lost when the tab closes | Is the client-side cart intended for this build? |
| Q8 | REG AC1: postal code numeric | Accepts alphanumeric (`1011AA`) | AC contradicts real formats (NL, UK, CA) — fix the AC? |
| Q9 | REG AC1: only ISO date format | Rejects customers under 18 after submit ("Customer must be 18 years old."); future dates accepted by the field | Is 18+ a rule? If yes — document it and validate inline |
| Q11 | REG AC1: no name format rule | Rejects `O'Brien`, `Smith-Jones` (422) | Intended? Real customers cannot register |
| Q12 | PD AC7: quantity clamped 1..999,999,999 | Limits to 99 with "You can order at most 99 of this product." | AC value looks unrealistic; is 99 the real limit? |
| Q13 | No AC limits quantities per product | `POST /invoices` rejects 2 × Thor Hammer: "You can only order one Thor Hammer." (400) | Is a per-order limit intended? If yes — document it and show it before checkout |

Evidence: `TC-029-register-response.txt` (Q8), `TC-029-future-dob-rejected-on-submit.png` (Q9), `F-5-last-name-format.txt` (Q11), `TC-009-quantity-capped-at-99.png` (Q12), `BUG-029-order-rejected-no-message.txt` (Q13).

## Suggestions and unconfirmed assumptions
- **Not verified:** `POST /invoices` takes `user_id` from the request body — a customer might create orders on behalf of another user. Not tested (time); recommended as the next security check.
- **Not verified:** the name sort options look swapped as well (option "Name (A - Z)" has value `name,desc`). Only price sorting was tested.
- Sign-in step text differs from SI AC5 ("Hello … you are already logged in" vs "You are already signed in as …") — functionally fine; align the text.
- Search with 2 or 41 characters is ignored silently; a hint about the 3–40 limit would help. Filters with no result show an empty grid without a message.
- `payment_account_number` is stored as an integer (`"1234567890"` → `1234567890`): leading zeros of real account numbers would be lost. Observed in responses; not tested with a leading zero.
- Not testable in this build: TOTP at checkout (SI AC3), discount badges (PO AC12, PD AC2, CART AC6 — only geo-discounts exist).

## Not reproduced / closed
- Country dropdown on registration ignores Playwright `selectOption` — keyboard and mouse selection work (author confirmed): automation note, not a defect.
- Product 5 image "broken" — the file loads (200); it was not loaded yet when I checked.
- Phone "loses the leading zero" — only the registration response type; `GET /users/me` returns `0612345678`.
