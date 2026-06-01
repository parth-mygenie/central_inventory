# Session-Start — CR-023: API Reality Check, Data Seed & Intelligence Gap Fix

> **Date:** 2026-06-01
> **Agent:** E1
> **CR:** CR-023
> **Status:** IN_PROGRESS

---

## Context

Audit of CR-021 (Intelligent UI Implementation) revealed 18 API-mismatch bugs across 14 screens.
Root cause: previous agent bypassed control gate — skipped Artifacts 0-4, implemented against static
HTML preview assumptions without validating real POS API response shapes. Tests (55/55 PASS) only
verified implemented subset, not the frozen Phase 7 spec.

## Bug Categories Found

- **Category A (1 bug):** Wrong field name in response parsing (OperationsHub `children` → should be `stores`)
- **Category B (13 bugs):** API doesn't return fields UI expects (restaurant names, stock health counts, cross-ref fields, intelligence metrics)
- **Category C (4 bugs):** Intelligence computation never implemented (TransferDetail snapshot, DirectDispatch auto-detect, Consumption days-of-cover, HierarchySummary health)

## This CR Scope

### Phase 0: Data Seed (current)
- Clean existing demo data (Cooking Oil, Maida, Patri, Red Meat, demo foods/recipes)
- Upload 158 ChocolateHut inventory items from owner's Excel
- Seed stock with batches, expiry dates, min thresholds
- Seed transfers (dispatch, request, receive, partial, dispute)
- Seed wastage records
- Result: full operational dataset for intelligence testing

### Phase 1: Impact Analysis
- API-by-API curl evidence for each of the 18 bugs
- Classify: Fixable Now / Computable / Backend Gap
- Document actual API response shapes

### Phase 2: Implementation Plan
- Per-screen fix plan with API evidence
- Priority ordering

### Phase 3: Implementation
- Execute fixes in priority order with testing

### Phase 4: QA
- Test against Phase 7 spec, not just against what was built
- Every intelligence feature from preview must be validated

## Governance
- All 7 artifacts will be completed BEFORE implementation begins
- No retroactive registration
