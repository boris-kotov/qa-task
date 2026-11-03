# Release decision — Toolshop purchase flow

**Build:** `SPRINT=sprint5-with-bugs`, app commit `ae7caecb`, local stand · **Date:** 2026-11-03 ·
**Scope:** catalog (search, filters, sorting, product page) → cart → checkout with payment methods, sign-in/registration as needed.

## Decision: **No-Go**

The purchase flow is **not ready for release**. Ten release-blocking defects were reproduced, and each of them alone
would stop a web shop release:
- any customer can read every customer's invoices and can place orders in another customer's account;
- the server accepts the prices sent by the browser and stores wrong order totals;
- 4 of 5 payment methods cannot capture payment data, and an invalid payment method is accepted;
- the order content can silently differ from what the customer wanted (re-adding a product, duplicate orders, overselling);
- customers from cities with short names cannot check out.

"Go with conditions" is not an option: the conditions would be fixes of the core flow itself.

## Release blockers (10)
| Area | Defect | Severity | What the customer / business gets |
|---|---|---|---|
| Data security | [BUG-001](BUGS.md#bug-001) | Critical | Every customer sees all other customers' invoices |
| Data security | [BUG-030](BUGS.md#bug-030) | Critical | A customer can create orders in another customer's account (`user_id` from the request) |
| Money | [BUG-017](BUGS.md#bug-017) | Critical | Any price can be sent and is stored (0.01 for a $48.41 item) |
| Money | [BUG-021](BUGS.md#bug-021) | Major | Order total 1 cent lower than the sum of its lines (cart and invoice) |
| Payment | [BUG-003](BUGS.md#bug-003) | Critical | No card / bank / BNPL / gift card fields; every method asks for "account name/number" |
| Payment | [BUG-004](BUGS.md#bug-004) | Major | "Errror 304 - Missing Payment Gateway" (or any string) creates an order |
| Order correctness | [BUG-005](BUGS.md#bug-005) | Major | Adding the same product again replaces the quantity (1 + 1 = 1) |
| Order correctness | [BUG-002](BUGS.md#bug-002) | Major | Double click on Confirm creates two orders with the same invoice number |
| Order correctness | [BUG-019](BUGS.md#bug-019) | Major | Out-of-stock products can be ordered; stock goes negative |
| Checkout access | [BUG-013](BUGS.md#bug-013) | Major | Valid short city names ("Oslo") block the address step |

## What works (verified)
- **Order with Cash on Delivery.** For a normal cart the order completes end to end in the UI, and the invoice has the
  right lines, quantities, prices, total, payment method and address (TC-023, autotest). The same holds for an order via
  the API (TC-024, autotest).
- **Catalog.** Search by a simple word, category and brand filters with exact result sets (TC-002, TC-005, autotest),
  pagination without gaps (TC-007), product page content (TC-011).
- **Stock in the UI.** Out-of-stock products cannot be added to the cart from the UI (TC-010).
- **Checkout sign-in.** Login at the checkout step keeps the cart; a wrong password shows an error; an already signed-in
  customer can proceed (TC-017, TC-018, TC-019).

## Other defects (not blocking, fix in this or the next release)
- **Major (6):** BUG-010 price range filter does nothing · BUG-011 combination discount missing · BUG-018 quantity-0 lines
  accepted · BUG-020 all four sort options reversed · BUG-027 search with "(" returns HTTP 500 · BUG-029 a rejected
  order shows no error.
- **Minor (10):** BUG-006, 007, 008, 012, 014, 015, 023, 024, 025, 028.
- **Trivial (3):** BUG-016, 022, 026.

Full reports with steps and evidence: [BUGS.md](BUGS.md).

## Coverage
| | Result |
|---|---|
| Test cases | 29 designed; **10 Pass, 19 Fail**, 0 not run ([TEST_CASES.md](TEST_CASES.md)) |
| Autotests | 11 (7 API, 4 UI): 4 pass, 7 expected failures marked `test.fail` with a BUG ID; stable under `--repeat-each` ([report](reports/html/index.html)) |
| Defects | 29 reproduced (4 Critical, 12 Major, 10 Minor, 3 Trivial) + 6 requirement issues |

Risks from [TEST_PLAN.md](TEST_PLAN.md#4-risks) and how they turned out:

| Risk | Outcome |
|---|---|
| R1 order/invoice wrong | ✗ materialised: BUG-021, BUG-002, BUG-018 |
| R2 payment method cannot be used | ✗ materialised: BUG-003, BUG-004 |
| R3 cart amounts wrong | ✗ materialised: BUG-005, BUG-006, BUG-021, BUG-023 |
| R4 server trusts client price | ✗ materialised: BUG-017 |
| R5 payment validation | ✗ materialised: BUG-003, BUG-004 |
| R6 address validation | ✗ materialised: BUG-013, BUG-024, BUG-012 |
| R7 sorting | ✗ materialised: BUG-020 (all four options reversed) |
| R8 search / filters | ~ partially: category, brand and simple search work; BUG-010, BUG-027, BUG-028, BUG-014 |
| R9 quantity boundaries | ~ partially: BUG-008; limit 99 vs AC (Q12) |
| R10 sign-in / cart kept | ✓ mitigated: TC-017–TC-019, TC-023 pass; registration: BUG-015, Q9, Q11 |
| R11 out of stock | ~ UI blocks it (TC-010); API does not (BUG-019) |
| R12 combination discount | ✗ materialised: BUG-011 |

## Not tested and why
- **Out of scope by the task:** admin, rentals (only used as data for the discount), contact form, favorites, profile.
- **Not in this build** (`features.md`): TOTP at checkout, invoice PDF, multi-language, privacy page.
- **Not tested for time reasons:**
  - geo-location discount — it needs geolocation spoofing;
  - confirmation e-mail via mailcatcher (Q4);
  - the UI part of invoice access by another user.
- **Cannot be tested until BUG-003 is fixed:** card number, expiry, CVV and gift card validation — the fields do not exist.
- **Security beyond observations.** Only targeted checks were made (BUG-001, BUG-017, BUG-030); no systematic
  security testing (authentication, injection, rate limits).
- **Not covered at all:**
  - other browsers (Chromium only) and mobile;
  - performance;
  - accessibility (only one observation: the +/− buttons have no accessible name).

## Open requirement questions
Owner input is needed before some ACs can be closed (details in [TEST_PLAN.md](TEST_PLAN.md#9-questions-and-assumptions)):
- **Q1** — client-side cart vs server-side persistence;
- **Q8** — postcode "numeric";
- **Q9** — undocumented 18+ rule;
- **Q11** — name format;
- **Q12** — quantity limit 99 vs 999,999,999;
- **Q13** — one Thor Hammer per order.

## Next steps
1. **Fix order for development:**
   1. security and money: BUG-001, BUG-030, BUG-017, BUG-021;
   2. payment: BUG-003, BUG-004;
   3. order integrity: BUG-005, BUG-002 (idempotent submit, unique invoice numbers), BUG-019, BUG-018;
   4. checkout access and feedback: BUG-013, BUG-029.
2. **Retest:**
   - run `RESET_DB=true npm test`. A fixed defect turns its `test.fail` test red ("expected to fail but passed"); then
     remove the marker and keep the test as a regression check;
   - retest manually the blockers without an autotest: BUG-003, BUG-002, BUG-013.
3. **New autotests after the fixes:**
   - payment validation per method;
   - double submit / idempotency;
   - invoice total = sum of lines for several price combinations;
   - search with special characters;
   - order ownership: `user_id` of another customer in `POST /invoices` (BUG-030).
4. **Clarify** the requirement questions with the product owner and update the ACs.
5. **Go criteria:**
   - all 10 blockers fixed and verified;
   - no new Critical or Major defect in the purchase flow;
   - all autotests pass without `test.fail` markers for blockers;
   - the not-tested items above are at least smoke-checked: e-mail, invoice access in the UI.

## Limitations of this assessment
- About 3 h 40 min of the 4 h budget (time log in [README](README.md#time-log)).
- One browser: Chromium via Playwright; some checks were confirmed by the author in a regular browser.
- The database was reset between runs, because orders consume stock.
- Defects found by AI-driven runs were reproduced on the stand; evidence is in `reports/evidence/`.
