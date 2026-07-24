# CR-027 Navigation Restructure — Mock Freeze

> **CR ID:** CR-027
> **Title:** Navigation Restructure — Grouped Sidebar
> **Status:** FROZEN — Owner approved 2026-06-13
> **Preview:** `/__dev/previews/CR027_navigation_restructure.html`

---

## Frozen Elements

### Sidebar Structure (6 collapsible sections, 15 nav items)

| Section | Items | New? |
|---------|-------|:----:|
| DASHBOARD | Operations Hub | — |
| INWARD | Vendor Management, Raw Material Master, Purchase | 2 renamed, 1 new nav |
| PRODUCTION | Sub-Recipe Master, Run Production, Production History | 1 extracted |
| OUTWARD | Store Management, Product Catalog, Stock Inventory, Pending Queues, History & Ledger | 1 merged, 1 renamed |
| REPORTS | Consumption Report, Wastage Report | 1 new nav |
| SETTINGS | Settings | — |

### Route Migration (6 changed, 3 redirects)

| Old | New |
|-----|-----|
| /vendors | /vendor-management |
| /catalogue/ingredients | /raw-materials |
| /procurement/new | /purchase |
| /catalogue/recipes | REDIRECT → /product-catalog |
| /catalogue/addon-recipes | REDIRECT → /product-catalog |
| /catalogue/products | /product-catalog |
| /hierarchy + /hierarchy/manage | /store-management |

### Collapse Behavior
- Sections remember state in localStorage
- Active page's section auto-expands
- Icon-only mode: section headers hidden, icons remain

---

*This mock is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
