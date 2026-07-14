# Session-Start — CR-022: Code Quality Review Fixes

> **Date:** 2026-06-01 (retroactive)
> **Agent:** E1
> **CR:** CR-022
> **Status:** RETROACTIVE REGISTRATION

---

## Context

External code quality analysis identified critical security and code quality issues.
This CR covers all fixes applied from that review.

## Fixes Applied

### Security: Hardcoded Secrets (12 test files)
Replaced all hardcoded `Qplazm@10` passwords with `os.environ.get('TEST_PASSWORD', '')`.
Files: test_central_inventory_api.py, test_p12_p14_contract.py, test_p17_p18_p19_features.py,
test_p21_catalogue.py, test_p21_catalogue_gaps.py, test_p25_wastage_report.py,
test_source_selector_flow.py, test_request_stock_flow.py, test_p20_stock_inventory.py,
test_p17_lifecycle.py, test_slice4_write_apis.py, test_p16_lifecycle.py

### Security: localStorage Documentation
Added security comment to useLoginContext.js documenting XSS risk and migration path.

### React: Array Index as Key (14 instances → 0)
Replaced `key={idx}` with stable IDs across 10 component files.

### React: useWriteAction Stale Closure
Replaced `submitting` state reference with `submittingRef` ref for race condition safety.

### Error Handling: Empty Catch Blocks (4 instances)
Added `console.warn` with context labels to api.js, useLoginContext.js, OperationsHub.jsx, IngredientCatalogue.jsx.

### Python: Insecure Random
Added clarifying comment + `secrets` import to seed_data.py.

## Deferred Items (documented, not blocking)
- localStorage → httpOnly cookies (requires backend changes)
- Component splitting (TransferDetail 601 lines)
- 43 nested ternary rewrites (cosmetic)
- Full 91 hook dependency audit
