# TC-013 evidence — same product added twice (manual, Playwright MCP, 2026-11-03 21:06 local)
Build: sprint5-with-bugs @ ae7caecb, UI http://localhost:4200

1. sessionStorage['cart'] cleared.
2. Open #/product/1 (Combination Pliers $14.15), quantity 1, click Add to cart.
   sessionStorage['cart'] = [{"id":1,"is_rental":0,"name":"Combination Pliers","quantity":1,"price":14.15,"total":14.15}]
3. Click Add to cart again (quantity 1).
   sessionStorage['cart'] = [{"id":1,"is_rental":0,"name":"Combination Pliers","quantity":1,"price":14.15,"total":14.15}]
   Header cart counter: 1

Expected: quantity 2, total 28.30. Actual: quantity 1, total 14.15.

Earlier in the same session: cart had Combination Pliers x2 (added with quantity 2); after adding Pliers x1 and
Combination Pliers x1 the cart showed Combination Pliers x1 | Pliers x1, cart total $26.16 (expected x3, $54.46).
