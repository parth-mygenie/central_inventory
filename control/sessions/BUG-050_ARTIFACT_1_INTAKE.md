# BUG-050 — Intake Artifact (Gate 1)

> **ID:** BUG-050
> **Type:** BUG
> **Registered:** 2026-10-18
> **Agent Role:** INTAKE
> **Source:** INVESTIGATION — CR-047 implementation vs locked design delta
> **Severity:** P2 — MEDIUM

---

## Problem Statement

Number inputs throughout the CR-047 Add Stock form (Qty, Unit Price, Amount, Fare, Payment Amount) display browser-native up/down spinner arrows. The locked mock design removed these via CSS pseudo-elements. The React implementation uses `style={{ MozAppearance: "textfield" }}` inline — this only works in Firefox. Chrome/Safari/Edge continue to show spinners because `::-webkit-inner-spin-button` cannot be set via inline style; it requires a CSS file rule.

---

## Scope

All `input[type=number]` elements in `AddStockPurchaseForm.jsx` — qty, unit price, amount (read-only), fare, payment amount per leg.

Global fix: add 3 lines to `frontend/src/App.css` or `frontend/src/index.css`. This would also clean up spinners on any other numeric inputs across the app.

---

## Evidence

- **Screenshot:** User-provided screenshot showing spinner arrows on Qty (20/30), Unit Price (0.04), Amount (0.80), Fare (19.05), Payment Amount (1000) in Chrome.
- **Code reality:** `grep "MozAppearance" AddStockPurchaseForm.jsx` → 5 hits, all inline style only. Zero hits for `-webkit-inner-spin-button` in App.css or index.css.
- **Source:** AGENT-DISCOVERED (during investigation of implementation vs locked design)
- **Confidence:** CONFIRMED — inline style cannot target pseudo-elements

---

## Duplicate Check

No existing BUG targets spinner arrows in number inputs. **DISTINCT.**

Related: CR-047 (implementation just completed — this is a post-implementation gap)

---

## Blast Radius

- `frontend/src/App.css` OR `frontend/src/index.css` — add 3 CSS lines
- No component files change
- Side effect: removes spinners app-wide (positive — no other screen wants spinners)
- Estimated scope: **SMALL** (~1 minute change)
- Hotspot files: NO

---

## Severity

**P2 — MEDIUM**

Not a data/logic error. Visual regression from locked design — form works correctly, just looks cluttered. No workaround needed (spinners don't break functionality).

---

## Owner Decisions Needed

None. Fix is unambiguous.

---

## Next Step

→ BUG FIX agent. Add to `frontend/src/App.css`:
```css
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
```
