# CR-046 — Settings UI Completion: Add 13 Missing Backend Settings

> **Created:** 2026-07-24
> **Role:** PLANNING
> **Code Reality:** NONE — zero missing settings exist in UI code
> **Scope Lock:** Files WILL change: `OperationalSettings.jsx`. Files will NOT touch: api.js, server.py, anything else.

---

## Gate 2: Impact Analysis

### Data Flow Trace

```
API: POST /operational-settings/get → returns 26 settings in resolved_settings{}
  → OperationalSettings.jsx reads resolved_settings[key] for each key in SETTING_GROUPS
  → Only 13 of 26 keys are defined in SETTING_GROUPS → 13 silently ignored
  
Fix: Add the 13 missing keys to SETTING_GROUPS → they render automatically
```

### Affected Files

| # | File | Lines | Risk | Impact |
|---|------|-------|:----:|--------|
| 1 | `OperationalSettings.jsx` | 11 (import) | LOW | Add 3 icons |
| 2 | `OperationalSettings.jsx` | 13-57 (SETTING_GROUPS) | LOW | Add entries to array + 3 new group objects |

### Risk Assessment

- **LOW risk overall** — purely additive change to a static config array
- No API changes needed — backend already returns all 26 settings
- No logic changes — the render loop already handles toggle vs number types
- `masterOnly` flag controls visibility for non-master stores

---

## Gate 3: Implementation Plan

### Execution: Single Edit

**File:** `frontend/src/components/central-inventory/OperationalSettings.jsx`

**Edit 1 — Line 11: Add 3 new icons to lucide-react import**

Current:
```javascript
import { Settings, Shield, ArrowRightLeft, Bell, Cpu, Lock, Info, RefreshCw, Loader2 } from "lucide-react";
```

New:
```javascript
import { Settings, Shield, ArrowRightLeft, Bell, Cpu, Lock, Info, RefreshCw, Loader2, DollarSign, Factory, ClipboardCheck } from "lucide-react";
```

**Edit 2 — Lines 20-24: Add `allow_lateral_franchise_transfer` to Hierarchy Policy group**

Add after line 23 (`allow_cross_central_franchise_dispatch`):
```javascript
      { key: "allow_lateral_franchise_transfer", label: "Allow Lateral Franchise Transfers", description: "Franchise stores can transfer stock to sibling franchise stores." },
```

**Edit 3 — Lines 30-35: Add `fefo_consumption_enabled` to Transfer Behavior group**

Add after line 34 (`allow_master_direct_franchise`):
```javascript
      { key: "fefo_consumption_enabled", label: "FEFO Consumption Tracking", description: "Consume stock in First-Expiry-First-Out order." },
```

**Edit 4 — Lines 47-57: Add 3 new groups before System group**

Insert before the System group (line 48):

```javascript
  {
    id: "pricing",
    label: "Transfer Pricing",
    icon: DollarSign,
    masterOnly: true,
    description: "Control how transfer pricing works across the hierarchy",
    keys: [
      { key: "allow_master_set_transfer_selling_price", label: "Master Sets Selling Price", description: "Master store can set selling prices on transfers." },
      { key: "allow_central_set_transfer_selling_price", label: "Central Sets Selling Price", description: "Central stores can set selling prices on transfers." },
      { key: "transfer_selling_price_required", label: "Selling Price Required", description: "Require selling price on all transfers.", danger: true },
      { key: "transfer_shipping_fee_allowed", label: "Allow Shipping Fee", description: "Allow shipping fee to be added on transfers." },
      { key: "central_resell_markup_percent", label: "Central Resell Markup (%)", type: "number", step: "0.1", description: "Default markup percentage for central store reselling." },
      { key: "central_resell_allow_override", label: "Allow Markup Override", description: "Central stores can override the default markup percentage." },
    ],
  },
  {
    id: "production",
    label: "Production",
    icon: Factory,
    keys: [
      { key: "production_enabled", label: "Enable Production Module", description: "Allow production runs and sub-recipe manufacturing.", danger: true },
    ],
  },
  {
    id: "purchase_orders",
    label: "Purchase Orders",
    icon: ClipboardCheck,
    keys: [
      { key: "require_po_for_purchase", label: "Require PO for Purchase", description: "Disable direct stock intake — all purchases must go through a Purchase Order.", danger: true },
      { key: "require_po_approval", label: "Require PO Approval", description: "Purchase orders need approval before they can be sent to vendors." },
      { key: "po_auto_close_on_full_receive", label: "Auto-Close on Full Receive", description: "Automatically close PO when all lines are fully received." },
      { key: "po_variance_alert_pct", label: "Variance Alert (%)", type: "number", step: "1", description: "Alert when received qty deviates from ordered by this percentage." },
    ],
  },
```

### Verification Matrix

| # | Check | How to Verify | Auto? |
|:--:|-------|---------------|:---:|
| 1 | Webpack compiles clean | `tail -5 frontend.out.log` → "compiled" | YES |
| 2 | All 26 settings visible in UI | Screenshot /settings as master (palmcentral) | NO |
| 3 | Hierarchy Policy shows 4 items (was 3) | Browser check | NO |
| 4 | Transfer Behavior shows 5 items (was 4) | Browser check | NO |
| 5 | New Pricing group shows 6 items | Browser check | NO |
| 6 | New Production group shows 1 item | Browser check | NO |
| 7 | New Purchase Orders group shows 4 items | Browser check | NO |
| 8 | Toggle/number types render correctly | Browser check | NO |
| 9 | masterOnly groups show "Affects all stores" badge + lock icon for non-master | Login as child and verify | NO |

### Post-Code Registry Checklist

```
- [ ] registry.json: CR-046 → status updated, artifact_refs
- [ ] L7: OperationalSettings.jsx listed
- [ ] Code markers: // CR-046 in modified file
- [ ] Dashboard drift check: node control/gen_dashboard_data.js --check → PASS
```

---

## Scope Lock

**Files WILL change:**
- `frontend/src/components/central-inventory/OperationalSettings.jsx` (icon import + SETTING_GROUPS array)

**Files will NOT touch:**
- `api.js` — no API changes needed
- `server.py` — proxy only
- `screenVisibility.js` — frozen
- All other files
