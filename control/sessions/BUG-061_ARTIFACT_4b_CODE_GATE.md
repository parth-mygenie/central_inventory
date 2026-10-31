# BUG-061 — ARTIFACT 4b: CODE GATE (Option B)

> **ID:** BUG-061
> **Artifact:** 4b — Code Gate (design revision)
> **Date:** 2026-10-20
> **Owner action:** "gate 4 go" (chat)
> **Plan:** `control/sessions/BUG-061_ARTIFACT_3b_IMPL_PLAN_OPTION_B.md`

## Approval

Owner gave GO. IMPLEMENTATION agent authorised — 3 edits, 1 file.

## Scope
1. Lines 239–240: `"Amount"` → `"Item Amt"` + insert `"Fare"` header
2. Lines 287–295: split Amount cell into Item Amt + Fare cells
3. Line 339: add one blank `<td />` on sub-rows for Fare column
