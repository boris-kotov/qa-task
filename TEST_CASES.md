# Test Cases — Toolshop (sprint5-with-bugs @ ae7caecb)

Scope, risks (R1–R12) and priorities: [TEST_PLAN.md](TEST_PLAN.md). Defects: [BUGS.md](BUGS.md).

**Manual run:** 2026-11-03, Playwright MCP against the local stand, fresh users registered via API/UI. Defect IDs refer to BUGS.md.

**Status values:** `Pass` · `Fail` · `Blocked (reason)` · `Not run (reason)`.
**Autotest:** `tests/<file> › <title>` or `Not automated`. Autotests were selected by the author (2026-11-03); TC-027 was dropped from automation after a determinism check, TC-002/TC-005 were added (catalog filters at API level). **Defect:** `BUG-00X` or `—`.

**AC references:** PO = Product Overview, PD = Product Detail, CART = Checkout – Cart Review, SI = Checkout – Sign In,
BA = Checkout – Billing Address, PAY = Checkout – Payment (Advanced), INV = Invoices, CD = Combination Discount,
REG = User Registration (all in `docs/user-stories/v5.md`).

## Common test data (seed after `migrate:fresh --seed`)
| Item | Value |
|---|---|
| Products | 26 regular (ids 1–26), 9 per page, 3 pages; rentals 27 Excavator $136.50, 28 Bulldozer $147.50, 29 Crane $153.50 |
| Products used | 1 Combination Pliers $14.15 · 2 Pliers $12.01 · 3 Bolt Cutters $48.41 (Brand name 2) · 4 Long Nose Pliers $14.24 (**stock 0**) · 5 Slip Joint Pliers $9.17 (Brand name 2) · 7 Hammer $12.58 |
| Categories | Hand Tools (1) → Hammer 3, Hand Saw 4, Wrench 5, Screwdriver 6, Pliers 7; Power Tools (2) → Grinder 8, Sander 9, Saw 10, Drill 11; Other 12 |
| Pliers category (7) | ids 1, 2, 3, 4, 5 |
| Search "pliers" | ids 1, 2, 4, 5 (4 results) |
| Customer | Fresh user per run, registered via `POST /users/register` with a unique e-mail; demo accounts are not used |
| Billing address | Street `Main Street 1`, City `Amsterdam`, State `Noord-Holland`, Country `Netherlands`, Postcode `1011AA` |

## Summary
| ID | Title | P | Risk | Status | Autotest | Defect |
|---|---|---|---|---|---|---|
| TC-001 | Sorting orders the entire result set across pages | P1 | R7 | Fail | `tests/ui/catalog.spec.ts › TC-001 sorting by price low to high orders the whole catalog across all pages` | BUG-020 |
| TC-002 | Search returns only matching products and resets filters | P1 | R8 | Pass | `tests/api/catalog.spec.ts › TC-002 TC-005 search and combined category + brand filter return exactly the matching products` | — |
| TC-003 | Search input boundaries and special input | P2 | R8 | Pass | Not automated | — |
| TC-004 | Category filter incl. parent → children selection | P1 | R8 | Fail | Not automated | BUG-014 |
| TC-005 | Brand filter and combined category + brand | P1 | R8 | Pass | `tests/api/catalog.spec.ts › TC-002 TC-005 search and combined category + brand filter return exactly the matching products` | — |
| TC-006 | Price range slider: defaults and filtering | P2 | R8 | Fail | Not automated | BUG-010 |
| TC-007 | Pagination shows every product exactly once | P2 | R8 | Pass | Not automated | — |
| TC-008 | Quantity selector +/− and minimum 1 | P1 | R9 | Fail | Not automated | BUG-008 |
| TC-009 | Manual quantity entry boundaries | P1 | R9 | Fail | Not automated | BUG-009 |
| TC-010 | Out-of-stock product cannot be added to cart | P2 | R11 | Pass | Not automated | — |
| TC-011 | Product card and product detail content | P2 | — | Pass | Not automated | — |
| TC-012 | Add to cart shows correct line and total | P0 | R3 | Fail | Not automated | BUG-006, BUG-007, BUG-016 |
| TC-013 | Several products and the same product twice | P0 | R3 | Fail | `tests/ui/cart.spec.ts › Cart › TC-013 adding a product that is already in the cart increases its quantity` | BUG-005 |
| TC-014 | Update quantity in cart recalculates totals | P0 | R3 | Fail | `tests/ui/cart.spec.ts › Cart › TC-014 changing a quantity in the cart recalculates the cart total` | BUG-022, BUG-021 |
| TC-015 | Delete item and empty cart | P0 | R3 | Fail | Not automated (moved to the manual run when the autotest set was trimmed) | BUG-023 |
| TC-016 | Combination discount (rental + non-rental) | P2 | R12 | Fail | Not automated | BUG-011 |
| TC-017 | Guest signs in at the checkout sign-in step | P1 | R10 | Pass | Not automated | — |
| TC-018 | Wrong password at checkout sign-in | P1 | R10 | Pass | Not automated | — |
| TC-019 | Already signed-in user at the sign-in step | P2 | R10 | Pass | Not automated | — |
| TC-020 | Billing address validation and pre-fill | P1 | R6 | Fail | Not automated | BUG-012, BUG-013 |
| TC-021 | Payment methods and per-method fields | P0 | R5 | Fail | Not automated | BUG-003 |
| TC-022 | Payment step required fields | P1 | R5 | Fail | Not automated | BUG-004 |
| TC-023 | End-to-end order in the UI | P0 | R1 R2 R10 | Pass | `tests/ui/checkout.spec.ts › TC-023 customer finds a product by search, checks out with Cash on Delivery and the invoice matches the cart` | — |
| TC-024 | API order with each payment method creates a correct invoice | P0 | R1 R2 | Pass | `tests/api/orders.spec.ts › Orders via API › TC-024 order creates an invoice with the ordered lines, catalog prices, total and payment method` | — |
| TC-025 | API order with tampered price | P0 | R4 | Fail | `tests/api/orders.spec.ts › Orders via API › TC-025 order with a tampered unit price is rejected or stored with the catalog price` | BUG-017 |
| TC-026 | API rejects invalid orders | P1 | R1 R11 | Fail | `tests/api/orders.spec.ts › Orders via API › TC-026 order with … is rejected with 422 and creates no invoice` (3 rows: quantity 0, out-of-stock product, unknown payment method) | BUG-018, BUG-019, BUG-004 |
| TC-027 | Double click on Confirm creates one invoice | P1 | R1 | Fail | Not automated (concurrency is not deterministic: duplicates in 18/20 pairs, see `reports/evidence/TC-027-concurrent-orders-spike.txt`) | BUG-002 |
| TC-028 | Another user's invoice is not accessible | P2 | R1 | Fail | `tests/api/invoice-access.spec.ts › TC-028 a customer cannot see invoices of another customer` | BUG-001 |
| TC-029 | Customer registration from checkout | P1 | R10 | Fail | Not automated | BUG-015 |

---

## Catalog

### TC-001 — Sorting orders the entire result set across pages
- **Priority:** P1 · **Risk:** R7 · **AC:** PO AC9
- **Preconditions:** Home page open, no filters.
- **Test data:** Sort options: Name (A - Z), Name (Z - A), Price (Low - High), Price (High - Low).
- **Steps:**
  1. Select a sort option.
  2. Collect product names and prices on page 1, then pages 2 and 3.
  3. Repeat for each option.
- **Expected result:** The concatenated list of all 26 products (3 pages) is ordered by the selected key and direction
  (names case-insensitive; prices numeric). No product is missing or duplicated.
- **Status:** Fail · **Actual result:** Autotest: with "Price (Low - High)" the 26 products are shown from the highest to the lowest price (exactly reversed). The option values are swapped (label "Price (Low - High)" sends `sort=price,desc`). Name A-Z not run (time). Evidence: autotest report · **Autotest:** `tests/ui/catalog.spec.ts › TC-001 sorting by price low to high orders the whole catalog across all pages` · **Defect:** BUG-020

### TC-002 — Search returns only matching products and resets filters
- **Priority:** P1 · **Risk:** R8 · **AC:** PO AC4
- **Preconditions:** Home page open.
- **Test data:** Category filter "Hammer" checked before search; query `pliers`.
- **Steps:**
  1. Check category "Hammer".
  2. Type `pliers` into the search field and click the search button.
- **Expected result:** Grid shows exactly ids 1, 2, 4, 5 (all names contain "pliers", case-insensitive); the "Hammer"
  checkbox is unchecked (filters reset).
- **Status:** Pass · **Actual result:** — · **Autotest:** `tests/api/catalog.spec.ts › TC-002 TC-005 search and combined category + brand filter return exactly the matching products` · **Defect:** —

### TC-003 — Search input boundaries and special input
- **Priority:** P2 · **Risk:** R8 · **AC:** PO AC4 (valid query 3–40 chars)
- **Preconditions:** Home page open.
- **Test data:** `pl` (2), `pli` (3), 40 × `a`, 41 × `a`, `<script>`, `'%`, Unicode `üß` (üß), `zzzzz` (no match).
- **Steps:** Enter each value and submit.
- **Expected result:** 2 and 41 chars are rejected (search not executed or validation message); 3 and 40 chars are executed;
  special characters do not break the page and are treated as text; no-match query shows an empty-result message, not an error.
- **Status:** Pass · **Actual result:** — · **Autotest:** Not automated · **Defect:** —

### TC-004 — Category filter incl. parent → children selection
- **Priority:** P1 · **Risk:** R8 · **AC:** PO AC5, AC6
- **Preconditions:** Home page open.
- **Test data:** Child "Pliers" (7); parent "Hand Tools" (1).
- **Steps:**
  1. Check "Pliers". Collect all results on all pages.
  2. Uncheck it. Check parent "Hand Tools".
  3. Uncheck all children of "Hand Tools".
- **Expected result:** Step 1: exactly ids 1–5. Step 2: all 5 children are checked; results are ids 1–18 (Hand Tools only).
  Step 3: parent becomes unchecked.
- **Status:** Fail · **Actual result:** Child filter "Pliers" returns exactly ids 1–5 (correct). Parent categories "Hand Tools" / "Power Tools" have no checkbox in the filter, so AC6 (parent selects all children) cannot be performed. Evidence: `reports/evidence/TC-004-no-parent-category-checkbox.png` · **Autotest:** Not automated · **Defect:** BUG-014

### TC-005 — Brand filter and combined category + brand
- **Priority:** P1 · **Risk:** R8 · **AC:** PO AC7, AC8
- **Preconditions:** Home page open.
- **Test data:** Brand "Brand name 2" (products 3, 5); category "Hammer" (3).
- **Steps:**
  1. Check "Brand name 2"; collect results.
  2. Additionally check category "Pliers"; collect results.
  3. Replace "Pliers" with "Hammer"; collect results.
- **Expected result:** Step 1: ids 3, 5. Step 2: ids 3, 5 (Pliers ∩ Brand 2). Step 3: empty result with a no-products message.
- **Status:** Pass · **Actual result:** — · **Autotest:** `tests/api/catalog.spec.ts › TC-002 TC-005 search and combined category + brand filter return exactly the matching products` · **Defect:** —

### TC-006 — Price range slider: defaults and filtering
- **Priority:** P2 · **Risk:** R8 · **AC:** PO AC10, AC11
- **Preconditions:** Home page open.
- **Test data:** Range 12–14. Expected: ids 2 $12.01, 13 $12.18, 7 $12.58, 6 $13.41, 18 $13.96. Just outside: 15 $14.14, 1 $14.15, 9 $11.14.
- **Steps:**
  1. Read slider defaults.
  2. Move handles to 12 and 14 (keyboard arrows on the focused handle).
  3. Collect all results.
- **Expected result:** Defaults min 1, max 100, scale maximum 200. Every result has 12 ≤ price ≤ 14; no product in range is missing.
- **Status:** Fail · **Actual result:** Defaults correct (min 1, max 100, scale 0–200). With handles at 13–14 the grid is not filtered (shows $9.17, $48.41): the UI requests `/products?between=price,13` (lower bound only); the API returns ids 6, 18 for `between=price,13,14`. Evidence: `reports/evidence/TC-006-price-range-request.txt` · **Autotest:** Not automated · **Defect:** BUG-010

### TC-007 — Pagination shows every product exactly once
- **Priority:** P2 · **Risk:** R8 · **AC:** PO AC3
- **Preconditions:** Home page open, default sort.
- **Steps:** Visit pages 1, 2, 3 via the pagination control; collect product ids.
- **Expected result:** 9 + 9 + 8 products, 26 unique ids, ids 1–26 all present (rentals excluded).
- **Status:** Pass · **Actual result:** — · **Autotest:** Not automated · **Defect:** —

## Product detail

### TC-008 — Quantity selector +/− and minimum 1
- **Priority:** P1 · **Risk:** R9 · **AC:** PD AC3–AC6
- **Preconditions:** Product 1 detail page.
- **Steps:**
  1. Read the quantity value.
  2. Click + twice.
  3. Click − three times.
- **Expected result:** Default 1; after + + → 3; after − − − → 1 (does not go below 1).
- **Status:** Fail · **Actual result:** Default 1 is correct, but + and − buttons do not change the value (1 → + + → 1; 3 → − → 3). Evidence: `reports/evidence/TC-008-quantity-buttons-no-effect.png` · **Autotest:** Not automated · **Defect:** BUG-008

### TC-009 — Manual quantity entry boundaries
- **Priority:** P1 · **Risk:** R9 · **AC:** PD AC7
- **Preconditions:** Product 1 detail page, empty cart.
- **Test data:** `0`, `-1`, `1`, `999999999`, `1000000000`, `abc`.
- **Steps:** For each value: type it into the quantity field, click Add to cart, read cart quantity (header counter / `sessionStorage['cart']`), clear the cart.
- **Expected result:** Value is clamped to 1..999,999,999: `0` and `-1` → 1; `1` → 1; `999999999` → 999,999,999;
  `1000000000` → 999,999,999; `abc` is not accepted (quantity stays valid). A cart line never has quantity ≤ 0.
- **Status:** Fail · **Actual result:** 0, −1, abc → 1 (correct). 999,999,999 and 1,000,000,000 (and 150) are capped at 99 instead of 999,999,999; cart stores total 1400.8500000000001 for 99 × 14.15. Evidence: `reports/evidence/TC-009-quantity-capped-at-99.png` · **Autotest:** Not automated · **Defect:** BUG-009

### TC-010 — Out-of-stock product cannot be added to cart
- **Priority:** P2 · **Risk:** R11 · **AC:** PO AC13, PD AC9
- **Test data:** Product 4 Long Nose Pliers (stock 0).
- **Steps:**
  1. Find product 4 on the home page.
  2. Open its detail page; try Add to cart.
- **Expected result:** Card shows "Out of stock"; on the detail page "Out of stock" is shown in red and Add to cart is disabled; cart stays empty.
- **Status:** Pass · **Actual result:** — · **Autotest:** Not automated · **Defect:** —

### TC-011 — Product card and product detail content
- **Priority:** P2 · **Risk:** — · **AC:** PO AC1, AC2, PD AC1, AC14
- **Test data:** Product 1 Combination Pliers $14.15, category Pliers, brand Brand name 1.
- **Steps:**
  1. Check the product card on the home page.
  2. Click it.
  3. Check the detail page.
- **Expected result:** Card shows image, name, price $14.15. Click opens `#/product/1`. Detail shows image, name, description,
  price $14.15, category badge "Pliers", brand badge "Brand name 1", and a related products section.
- **Status:** Pass · **Actual result:** — · **Autotest:** Not automated · **Defect:** —

## Cart

### TC-012 — Add to cart shows correct line and total
- **Priority:** P0 · **Risk:** R3 · **AC:** PD AC8, CART AC1
- **Preconditions:** Empty cart.
- **Test data:** Product 1 $14.15, quantity 2.
- **Steps:**
  1. Open product 1, set quantity 2, click Add to cart.
  2. Open the cart (`#/checkout`).
- **Expected result:** Message "Product added to shopping cart."; header counter 2; table columns Item, Quantity, Price, Total, Actions;
  line: Combination Pliers, qty 2, price $14.15, line total $28.30; cart total $28.30.
- **Status:** Fail · **Actual result:** Cart contents in sessionStorage are correct (qty 2, total 28.3) and cart total shows $28.30, but: (1) message "Oeps, something went wrong." instead of "Product added to shopping cart."; (2) line total shows $00.00; (3) the actions column is labelled "Total" instead of "Actions". Evidence: `reports/evidence/TC-012-add-to-cart-error-message.png`, `reports/evidence/TC-012-cart-line-total-zero.png` · **Autotest:** Not automated · **Defect:** BUG-006, BUG-007, BUG-016

### TC-013 — Several products and the same product twice
- **Priority:** P0 · **Risk:** R3 · **AC:** CART AC1
- **Preconditions:** Empty cart.
- **Test data:** Product 1 qty 1, product 2 qty 1, product 1 qty 1 again.
- **Steps:** Add the three items in order; open the cart.
- **Expected result:** Two lines: Combination Pliers qty 2 / $28.30; Pliers qty 1 / $12.01; cart total $40.31; counter 3.
- **Status:** Fail · **Actual result:** Adding a product that is already in the cart replaces its quantity instead of adding to it: 1 + 1 → 1 (expected 2); earlier 2 + 1 → 1. Cart total is too low accordingly. Evidence: `reports/evidence/TC-013-same-product-twice.md` · **Autotest:** `tests/ui/cart.spec.ts › Cart › TC-013 adding a product that is already in the cart increases its quantity` · **Defect:** BUG-005

### TC-014 — Update quantity in cart recalculates totals
- **Priority:** P0 · **Risk:** R3 · **AC:** CART AC2
- **Preconditions:** Cart contains product 1 qty 1 and product 2 qty 1.
- **Test data:** Change product 1 quantity to 3.
- **Steps:** In the cart, set the quantity of Combination Pliers to 3 and leave the field.
- **Expected result:** Message "Product quantity updated."; line total $42.45 (exactly, two decimals); Pliers line unchanged $12.01;
  cart total $54.46.
- **Status:** Fail · **Actual result:** Autotest: stored quantities and the cart total are recalculated correctly (3 × 14.15 + 12.01 = $54.46), but the message "Product quantity updated." is never shown (CART AC2). Separately the autotest with random data found a rounding defect: 3 × $119.24 + $12.01 shown as $369.72 instead of $369.73 (BUG-021). Evidence: autotest report, `reports/evidence/BUG-021-cart-total-truncated.txt` · **Autotest:** `tests/ui/cart.spec.ts › Cart › TC-014 changing a quantity in the cart recalculates the cart total` · **Defect:** BUG-022, BUG-021

### TC-015 — Delete item and empty cart
- **Priority:** P0 · **Risk:** R3 · **AC:** CART AC3, AC4, AC5
- **Preconditions:** Cart contains product 1 qty 1 and product 2 qty 1 (total $26.16).
- **Steps:**
  1. Delete Combination Pliers.
  2. Delete Pliers.
- **Expected result:** After step 1: one line (Pliers), total $12.01. After step 2: message "Your shopping cart is empty",
  no Proceed button, header counter gone or 0.
- **Status:** Fail · **Actual result:** Delete control in a cart row has no effect: after clicking it (twice, two locators) both lines and the total $26.16 stay, sessionStorage unchanged. Confirmed manually by the author in a regular browser (signed-in customer): items cannot be removed from the cart at all. (In the MCP browser the font-awesome icon is blocked by the local-only network rule, which does not change the result.) Evidence: `reports/evidence/TC-015-delete-has-no-effect.png` · **Autotest:** Not automated (moved to the manual run when the autotest set was trimmed) · **Defect:** BUG-023

### TC-016 — Combination discount (rental + non-rental)
- **Priority:** P2 · **Risk:** R12 · **AC:** CART AC7, AC8, CD AC1–AC3
- **Preconditions:** Empty cart.
- **Test data:** Product 1 $14.15 qty 1; rental 27 Excavator $136.50, 1 hour.
- **Steps:**
  1. Add both; open the cart.
  2. Delete the rental.
- **Expected result:** Step 1: subtotal $150.65, discount 15% = $22.60, total $128.05 (Q5 rounding). Step 2: no discount, total $14.15.
- **Status:** Fail · **Actual result:** Cart with Combination Pliers $14.15 + Excavator (rental) $136.50 shows total $150.65; no subtotal / 15% discount / final total rows (expected $128.05). Evidence: `reports/evidence/TC-016-no-combination-discount.png` · **Autotest:** Not automated · **Defect:** BUG-011

## Checkout

### TC-017 — Guest signs in at the checkout sign-in step
- **Priority:** P1 · **Risk:** R10 · **AC:** SI AC1, AC2, AC4
- **Preconditions:** Not signed in; cart contains product 1 qty 1; fresh user registered via API.
- **Steps:**
  1. In the cart click Proceed.
  2. Enter the fresh user's e-mail and password; submit.
  3. Proceed.
- **Expected result:** Step 1 shows a login form (e-mail, password, submit). After login the user is signed in and reaches
  the billing address step; the cart still contains product 1 qty 1.
- **Status:** Pass · **Actual result:** — · **Autotest:** Not automated · **Defect:** —

### TC-018 — Wrong password at checkout sign-in
- **Priority:** P1 · **Risk:** R10 · **AC:** SI AC4 (negative)
- **Preconditions:** As TC-017.
- **Test data:** Correct e-mail, password `WrongPass1!`.
- **Steps:** At the sign-in step submit the wrong password once.
- **Expected result:** An error message is shown; user stays on the sign-in step, not signed in; cart unchanged.
- **Status:** Pass · **Actual result:** — · **Autotest:** Not automated · **Defect:** —

### TC-019 — Already signed-in user at the sign-in step
- **Priority:** P2 · **Risk:** R10 · **AC:** SI AC5
- **Preconditions:** Signed in as the fresh user (first name/last name known); cart contains product 1.
- **Steps:** In the cart click Proceed.
- **Expected result:** Message "You are already signed in as <First Name> <Last Name>"; Proceed leads to the billing address step.
- **Status:** Pass · **Actual result:** Works as intended (name shown, user can proceed). Wording differs from AC5: "Hello Manual Tester, you are already logged in. You can proceed to checkout." — recorded as a suggestion, not a defect. · **Autotest:** Not automated · **Defect:** —

### TC-020 — Billing address validation and pre-fill
- **Priority:** P1 · **Risk:** R6 · **AC:** BA AC1–AC4
- **Preconditions:** Signed-in fresh user registered with the common billing address; cart with product 1; at the address step.
- **Test data:** Lengths: street 70/71, city 40/41, state 40/41, country 40/41, postcode 10/11 characters.
- **Steps:**
  1. Check pre-filled values.
  2. Clear each field in turn.
  3. Enter max and max+1 lengths.
- **Expected result:** Fields pre-filled from the account. An empty field is highlighted as invalid and Proceed is disabled.
  Max length is accepted; max+1 is not possible to enter or is reported as invalid.
- **Status:** Fail · **Actual result:** Empty field → invalid + Proceed disabled (correct). But: (1) postcode pre-filled as "missing value" although the account has 1011AA (`/users/me`); (2) no max length: street 71, state 41, country 41, postcode 11 chars accepted; (3) valid short city names are rejected (e.g. "Oslo", 4 chars) — Proceed stays disabled. Evidence: `reports/evidence/TC-020-postcode-prefill-missing-value.png`, `reports/evidence/TC-020-users-me-address.txt`, `reports/evidence/TC-020-city-oslo-rejected.png` · **Autotest:** Not automated · **Defect:** BUG-012, BUG-013

### TC-021 — Payment methods and per-method fields
- **Priority:** P0 · **Risk:** R5 · **AC:** PAY AC1–AC8
- **Preconditions:** Signed-in fresh user, cart with product 1, at the payment step.
- **Steps:** Open the method dropdown; select each method in turn and record the visible fields; switch methods after typing a value.
- **Expected result:** Options exactly: Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card.
  Bank Transfer → bank name, account name, account number. Credit Card → card number (XXXX-XXXX-XXXX-XXXX), expiration date (MM/YYYY),
  CVV, card holder name. Buy Now Pay Later → "Monthly installments" dropdown 3/6/9/12. Gift Card → gift card number, validation code.
  Cash on Delivery → no additional fields. Switching method resets the form.
- **Status:** Fail · **Actual result:** Option list matches AC1 plus an extra "Errror 304 - Missing Payment Gateway". Every method (incl. Cash on Delivery) shows the same two required fields "Account name" and "Account number"; no bank name, card number / expiry / CVV / holder, installments or gift card fields. Evidence: `reports/evidence/TC-021-credit-card-fields.png` · **Autotest:** Not automated · **Defect:** BUG-003

### TC-022 — Payment step required fields
- **Priority:** P1 · **Risk:** R5 · **AC:** PAY AC1, AC9 (negative)
- **Preconditions:** As TC-021.
- **Steps:**
  1. Without selecting a method, try Confirm.
  2. Select Bank Transfer, leave fields empty, try Confirm.
  3. Select the extra option "Errror 304 - Missing Payment Gateway" if present, try Confirm.
- **Expected result:** Steps 1–2: Confirm disabled or validation errors, no order created (no new invoice for the user via API).
  Step 3: the option should not exist; if it does, no order is created and a meaningful error is shown.
- **Status:** Fail · **Actual result:** No method / empty fields → Confirm disabled (correct). With "Errror 304 - Missing Payment Gateway" the UI shows "Payment was successful" and the second Confirm creates invoice INV-2026000005 with `payment_method: "error"`. Evidence: `reports/evidence/TC-022-error-304-payment-successful.png`, `reports/evidence/TC-022-order-with-error-304-method.txt` · **Autotest:** Not automated · **Defect:** BUG-004

### TC-023 — End-to-end order in the UI
- **Priority:** P0 · **Risk:** R1 R2 R10 · **AC:** PAY AC9, INV AC1, AC2
- **Preconditions:** Fresh user registered via API, not signed in, empty cart.
- **Test data:** Search `pliers`; product 2 Pliers $12.01 qty 2; product 5 Slip Joint Pliers $9.17 qty 1; common billing address; Cash on Delivery.
- **Steps:**
  1. Search `pliers`, open Pliers from the result, set qty 2, Add to cart.
  2. Go back, open Slip Joint Pliers, Add to cart.
  3. Cart → Proceed → sign in → Proceed → address → Proceed → payment Cash on Delivery → Confirm.
  4. Open My invoices and the new invoice detail.
- **Expected result:** Confirmation shows an invoice number; cart is cleared. `GET /invoices` for the user returns exactly one invoice with
  lines Pliers ×2 @ 12.01 and Slip Joint Pliers ×1 @ 9.17, total 33.19, payment method Cash on Delivery, billing address as entered.
  My invoices list shows the invoice number, street, date, total $33.19; detail shows address, payment method and the two lines.
- **Status:** Pass · **Actual result:** — · **Autotest:** `tests/ui/checkout.spec.ts › TC-023 customer finds a product by search, checks out with Cash on Delivery and the invoice matches the cart` · **Defect:** —

### TC-024 — API order with each payment method creates a correct invoice
- **Priority:** P0 · **Risk:** R1 R2 · **AC:** PAY AC9
- **Preconditions:** Fresh user registered and logged in via API (bearer token).
- **Test data:** Items: product 1 qty 2 @ 14.15, product 7 qty 1 @ 12.58, total 40.88; methods: Bank Transfer, Cash on Delivery,
  Credit Card, Buy Now Pay Later, Gift Card; account name `Test User`, account number `1234567890`.
- **Steps:** For each method `POST /invoices`, then `GET /invoices/{id}`.
- **Expected result:** 2xx with invoice id and number; the stored invoice has payment method = sent method, two lines with
  the quantities and catalog unit prices, total 40.88, billing address as sent.
- **Status:** Pass · **Actual result:** — · **Autotest:** `tests/api/orders.spec.ts › Orders via API › TC-024 order creates an invoice with the ordered lines, catalog prices, total and payment method` · **Defect:** —

### TC-025 — API order with tampered price
- **Priority:** P0 · **Risk:** R4 · **AC:** — (Q6)
- **Preconditions:** As TC-024.
- **Test data:** Product 3 Bolt Cutters (catalog $48.41) qty 1 sent with `unit_price` 0.01 and `total` 0.01.
- **Steps:** `POST /invoices`; if created, `GET /invoices/{id}`.
- **Expected result:** Either rejected (4xx) or the stored invoice uses the catalog price: line unit price 48.41, total 48.41.
  An invoice with 0.01 is a defect.
- **Status:** Fail · **Actual result:** Autotest: an order with `unit_price` 0.01 for a product priced e.g. 48.41 is accepted (201) and the invoice stores 0.01 — the server trusts client prices. Evidence: autotest report · **Autotest:** `tests/api/orders.spec.ts › Orders via API › TC-025 order with a tampered unit price is rejected or stored with the catalog price` · **Defect:** BUG-017

### TC-026 — API rejects invalid orders
- **Priority:** P1 · **Risk:** R1 R11 · **AC:** —
- **Preconditions:** As TC-024; count the user's invoices before each request.
- **Test data (one request each):** empty `invoice_items`; quantity 0; quantity −1; product id 999999; product 4 (stock 0);
  missing `billing_city`; no `Authorization` header.
- **Steps:** Send each request; then `GET /invoices` for the user.
- **Expected result:** 422 for invalid payloads (401 without auth); the user's invoice count is unchanged after each request.
- **Status:** Fail · **Actual result:** Autotest: all three invalid orders are accepted with 201 and create an invoice — quantity 0; an out-of-stock product (stock goes negative: Long Nose Pliers 0 → −1, Sheet Sander 11 → −30 in the TC-027 spike); payment method "Missing Payment Gateway". Evidence: autotest report, `reports/evidence/TC-027-concurrent-orders-spike.txt` · **Autotest:** `tests/api/orders.spec.ts › Orders via API › TC-026 order with … is rejected with 422 and creates no invoice` (3 rows: quantity 0, out-of-stock product, unknown payment method) · **Defect:** BUG-018, BUG-019, BUG-004

### TC-027 — Double click on Confirm creates one invoice
- **Priority:** P1 · **Risk:** R1 · **AC:** —
- **Preconditions:** Signed-in fresh user at the payment step with product 1, Cash on Delivery selected.
- **Steps:** Double-click Confirm; then `GET /invoices` for the user.
- **Expected result:** Exactly one invoice is created.
- **Status:** Fail · **Actual result:** Double click on Confirm created two invoices (ids 12 and 13) with the same invoice number INV-2026000006, same lines and total. Evidence: `reports/evidence/TC-027-double-click-two-invoices.txt` · **Autotest:** Not automated (concurrency is not deterministic: duplicates in 18/20 pairs, see `reports/evidence/TC-027-concurrent-orders-spike.txt`) · **Defect:** BUG-002

### TC-028 — Another user's invoice is not accessible
- **Priority:** P2 · **Risk:** R1 · **AC:** INV AC3
- **Preconditions:** User A has an invoice (id X); user B is a separate fresh user.
- **Steps:**
  1. As B, `GET /invoices/X`.
  2. As B in the UI open `#/account/invoices/X`.
- **Expected result:** API 403/404 without A's data; UI shows a "not found" message.
- **Status:** Fail · **Actual result:** API: a freshly registered user (id 4) gets all invoices of users 2 and 3 from `GET /invoices` (billing address, payment method, account number) and `GET /invoices/1` returns 200 with user 2's invoice. UI part not run. Evidence: `reports/evidence/TC-028-invoices-of-other-users.txt` · **Autotest:** `tests/api/invoice-access.spec.ts › TC-028 a customer cannot see invoices of another customer` · **Defect:** BUG-001

### TC-029 — Customer registration from checkout
- **Priority:** P1 · **Risk:** R10 · **AC:** REG AC1, AC5, AC6
- **Preconditions:** Not signed in, cart with product 1.
- **Test data:** Unique e-mail, password `Str0ng!Passw0rd`, common billing address, date of birth 1990-01-01; then the same e-mail again.
- **Steps:**
  1. Cart → Proceed → Register link; fill the form; submit.
  2. Sign in with the new account.
  3. Register again with the same e-mail.
- **Expected result:** Step 1: account created, user redirected to login. Step 2: sign-in succeeds.
  Step 3: registration rejected with a duplicate e-mail message.
- **Status:** Fail · **Actual result:** Steps 1–2 pass in the UI (register from checkout → login page, cart kept → sign-in OK). Step 3 (UI and API): the duplicate e-mail is rejected (API 409), but the message is "User already registered - Your password hint is: Name of your cat!" instead of "Email is already in use." — anyone who knows a customer's e-mail sees that account's password hint. Note for automation: `selectOption` on the country dropdown sets the DOM value but the Angular form stays invalid; selecting by keyboard (type the country name, Tab) works. Manual selection with the mouse works (checked by the author). Evidence: `reports/evidence/TC-029-duplicate-email-ui-password-hint.png`, `reports/evidence/TC-029-duplicate-email-response.txt` · **Autotest:** Not automated · **Defect:** BUG-015

---

## AC traceability
| Story | AC | Test case(s) |
|---|---|---|
| Product Overview | AC1 grid, AC2 navigate | TC-011 |
| | AC3 pagination | TC-007 |
| | AC4 search | TC-002, TC-003 |
| | AC5 category, AC6 hierarchy | TC-004 |
| | AC7 brand, AC8 combined | TC-005 |
| | AC9 sorting | TC-001 |
| | AC10 slider, AC11 range | TC-006 |
| | AC13 out of stock | TC-010 |
| Product Detail | AC1 info, AC14 related | TC-011 |
| | AC3–AC6 quantity selector | TC-008 |
| | AC7 manual quantity | TC-009 |
| | AC8 add to cart | TC-012 |
| | AC9 out of stock | TC-010 |
| Checkout – Cart Review | AC1 contents | TC-012, TC-013 |
| | AC2 update | TC-014 |
| | AC3 delete, AC4 empty, AC5 proceed | TC-015 |
| | AC7, AC8 combined discount | TC-016 |
| Checkout – Sign In | AC1, AC2, AC4 | TC-017, TC-018 |
| | AC5 already signed in | TC-019 |
| Checkout – Billing Address | AC1–AC4 | TC-020 |
| Checkout – Payment | AC1–AC8 | TC-021, TC-022 |
| | AC9 successful order | TC-023, TC-024 |
| Invoices | AC1 list, AC2 detail | TC-023 |
| | AC3 not found | TC-028 |
| Combination Discount | AC1–AC3 | TC-016 |
| User Registration | AC1, AC5, AC6 | TC-029 |

**Excluded ACs (reason):** SI AC3 TOTP — not in this build (`features.md`); PD AC10–AC13 rental slider and favorites — out of scope;
discount display PO AC12, PD AC2, CART AC6 and the Geo-Location Discount story — only location-based discounts exist, geolocation
spoofing is out of scope (TEST_PLAN); CD AC4 discount on invoice — follows TC-016, not run separately; PAY AC9 confirmation e-mail — Q4;
REG AC2–AC4 password strength UI — not needed for the purchase flow.

---

## Findings to report in BUGS.md (collected during the manual run)
Rule agreed with the author: behaviour that does not match an acceptance criterion is a defect — unless the criterion itself
is doubtful; then it is a **requirement issue** (see TEST_PLAN Q8–Q10) and is classified explicitly.
Each item is reproduced on the stand; evidence in `reports/evidence/`.

| # | Finding | Classification | Source | Evidence |
|---|---|---|---|---|
| F-1 | Duplicate e-mail on registration shows "User already registered - Your password hint is: Name of your cat!" instead of "Email is already in use." (REG AC5). No password hint is ever entered at registration, so the text itself is wrong; it also confirms the account exists | Application defect (AC5 is clear and reasonable) | TC-029, author + AI | `TC-029-duplicate-email-ui-password-hint.png`, `TC-029-duplicate-email-response.txt` |
| F-2 | Date of birth in the future (2030-01-01) is accepted by the field (no `max`, field valid; the author could pick a future date in the date picker) and is rejected only after Register with "Customer must be 18 years old." The 18+ rule is not in REG AC1 (only ISO format) → question in TEST_PLAN + UX defect (late validation) | Requirement issue (Q9: undocumented 18+ rule) + usability suggestion (late validation) | Found manually by the author, reproduced by AI | `TC-029-future-dob-rejected-on-submit.png` |
| F-3 | Registration accepts postal code `1011AA` although REG AC1 says "Postal code (numeric)" (API 201, UI registration succeeded) | Requirement issue (Q8: AC "numeric" looks wrong, app behaviour reasonable) | TC-029 | `TC-029-register-response.txt` |
| F-4 | Defects already listed per case: TC-004, 006, 008, 009, 012, 013, 016, 020, 021, 022, 027, 028 | Application defects (per case) | Manual run | see each case |
| F-5 | Registration rejects real last names with an apostrophe or hyphen (`O'Brien`, `Smith-Jones` → 422 "The last name field format is invalid."); REG AC1 has no name format rule | Requirement issue (Q11: undocumented name format) | Found by the autotest data generator (faker), reproduced via API | `F-5-last-name-format.txt` |

Not a defect (closed): country dropdown — `selectOption` does not update the Angular form, keyboard selection and mouse
selection work; automation note only.
