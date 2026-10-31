# Design System Consistency Recommendation

> **Date:** 2026-06-01
> **Reference:** UI/UX Final Design Review Report
> **Scope:** CSS variables, tokens, and patterns used across all 9 HTML previews

---

## 1. CSS Variable System — CONSISTENT

All 9 previews share the identical `:root` variable set:

```css
--bg: #fff
--surface: #fff
--surface2: #f4f4f5
--surface3: #fafafa
--border: #e4e4e7
--border-light: #f4f4f5
--text: #09090b
--text-sec: #52525b
--text-muted: #a1a1aa
--primary: #18181b
--primary-fg: #fafafa
--amber: #b45309
--amber-light: #fffbeb
--amber-border: #fde68a
--red: #dc2626
--red-light: #fef2f2
--red-border: #fecaca
--green: #16a34a
--green-light: #f0fdf4
--green-border: #bbf7d0
--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--mono: 'SF Mono', Consolas, monospace
--sidebar-w: 200px
```

**Verdict:** Perfectly consistent. No deviations across files.

---

## 2. Color Palette Adherence — 3-Color Rule

| Color | Semantic Use | Consistent? |
|-------|-------------|:-----------:|
| **Red** (`#dc2626`) | Problem, danger, out-of-stock, expired, insufficient, negative projections | YES |
| **Amber** (`#b45309`) | Caution, warning, low-stock, aging, near-expiry, anomaly | YES |
| **Neutral gray** (various) | Default, adequate, healthy, informational, secondary text | YES |
| **Green** (`#16a34a`) | Success confirmation, received, synced, active, match | YES (accepted per Phase 7) |

**One Minor Deviation Found:**
- **E8 Hierarchy Management** uses `#1e40af` (blue) for "Master Store" badge and `#9a3412` (warm orange) for "Outlet" badge
- **Assessment:** These are semantic role-type indicators, not status colors. They serve a different purpose than the 3-color palette (which governs status/health). **Recommend: ACCEPT** — role badges use subdued tints that don't compete with status colors.

---

## 3. Typography System — CONSISTENT

| Element | Size | Weight | Font | Consistent? |
|---------|:----:|:------:|------|:-----------:|
| Page heading (h1) | 20-22px | 700 | System | YES |
| Section dividers | 13px uppercase | 700 | System | YES |
| Card headings (h2) | 11px uppercase | 600 | System | YES |
| Body text | 14px | 400 | System | YES |
| Table body | 12px | 400 | System | YES |
| Table headers | 10px uppercase | 600 | System | YES |
| Quantities/numbers | Various | 700 | Monospace | YES |
| Labels/meta | 10-11px | Various | System | YES |
| Badges | 10px | 600 | System | YES |

**No deviations found.** Typography is well-structured with clear hierarchy.

---

## 4. Spacing & Layout Tokens

| Token | Value | Consistent? |
|-------|:-----:|:-----------:|
| Content padding | 20px top, 28px sides | YES (except mobile: 16px) |
| Card margin-bottom | 12px | YES |
| Card padding (head) | 10px 16px | YES |
| Card padding (body) | 12px 16px | YES |
| Grid gaps | 10-12px | YES |
| Table cell padding | 8-10px 14-16px | YES |

---

## 5. Component Pattern Consistency

### Cards
- **Pattern:** `.card` > `.card-head` > content
- **Consistent across:** All 9 files
- **Variant:** `.impact-card` (amber left border) — used in B3, B5

### Badges
- **Pattern:** `.badge-s` + modifier (`.badge-ok`, `.badge-warn`, `.badge-danger`, `.badge-active`)
- **Consistent across:** All files
- **Variant:** Age badges (`.age.fresh`, `.age.aging`, `.age.stale`) — B2 only

### Buttons
- **Pattern:** `.btn` (default), `.btn-primary` (dark), `.btn-danger` (red outline)
- **Consistent across:** All files
- **Issue:** Inline style overrides for size vary (see GSR-02 in main report)

### Stock Value Indicators
- **Pattern:** `.stock-val` / `.sv` with colored dot + text
- **Variants:** `.out` (red), `.low` (amber), `.ok` (gray)
- **Consistent across:** B1, B2, B3, B5, D1

### Form Elements
- **Pattern:** `.field` > `label` > `input/select` + `.hint`/`.warn`/`.err`
- **Consistent across:** C1, C2, C3

---

## 6. Recommendations for Implementation

### REC-01: Extract shared CSS to a single design system file
During React implementation, extract all shared CSS variables and component classes to `index.css` or a new `design-system.css`. The previews already demonstrate this consistency — codify it.

### REC-02: Define button size tokens
```css
.btn-xs { font-size: 10px; padding: 3px 8px; }
.btn-sm { font-size: 11px; padding: 5px 12px; }
.btn-md { font-size: 12px; padding: 7px 18px; }
.btn-lg { font-size: 14px; padding: 10px 20px; }
```

### REC-03: Keep the green for success/active states
Green appears in: post-submit confirmation, "Received" status, "Synced" push status, "Active" vendor status, match indicators. It's a 4th color technically, but it's exclusively for positive confirmation and never conflicts with the 3-color status palette.

### REC-04: Role type badge colors (blue/orange in E8) are acceptable
These denote hierarchy level identity, not operational status. They don't conflict with red/amber/green status palette.

---

**DESIGN SYSTEM VERDICT: HIGHLY CONSISTENT — NO REMEDIATION NEEDED**

The previews demonstrate a mature, disciplined design system. During implementation, codify the patterns into shared CSS and component abstractions. No fundamental changes required.
