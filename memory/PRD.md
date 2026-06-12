# Central Inventory — PRD

## Problem Statement
End-to-end validation of P30 M0 production flow including mixed-vendor cost model through the full chain: vendor → manufacture → transfer → POS sale.

## Key Finding
**Cross-segment production cost bug:** When a production run consumes raw material from multiple FEFO segments (different vendors/prices), `line_cost` uses the first segment's unit price for the entire quantity, not a weighted average. Under-counts by ₹4.675 per 155-cookie batch in test case.

## Completed Validation
- 5-store hierarchy, 2 vendors at different prices, 44 ingredients, 4 sub-recipes
- 8 production runs with full FEFO cost tracing  
- 12+ transfers: direct dispatch, request flow, partial approval, 2-hop chain, cross-central
- Mixed-vendor FG batch produced, transferred to both franchise stores
- POS consumption confirmed at 809 (order 939863) and 810 (order 939865)
- FEFO respected at all levels: production, transfer, POS consumption

## Full Report
`/app/AI/Plans/P30_M0_PRODUCTION_VALIDATION_REPORT.md`
