# BUG-063 — ARTIFACT 1: INTAKE
> **ID:** BUG-063
> **Artifact:** 1 — Intake (Gate 1)
> **Date:** 2026-10-20
> **Role:** INTAKE
> **Source:** OWNER-REPORTED (screenshot + message: "the drop down for source selector is too small - and also when we click the drop down text it not opens up make irritate for its precision make it user friendly")
> **Related:** BUG-062 (same file, same region — immediate follow-on)

---

## Classification

| Field | Value |
|-------|-------|
| **Severity** | P2 — MEDIUM (usable but irritating; storekeeper must aim precisely) |
| **Type** | UX / Interaction bug |
| **Screen** | Direct Dispatch — Source (FEFO) column |
| **Component** | `DispatchRow` source selector cell, `DirectDispatchForm.jsx` lines 810–832 |

---

## Code Reality Check

```bash
grep -n "h-6.*select\|<select\|disabled.*included" \
  frontend/src/components/central-inventory/DirectDispatchForm.jsx
```
→ Line 812: native `<select>` present. Line 813: `h-6`. Line 816: `disabled={!row.included || submitting}`.
**Code Reality: CONFIRMED — bug exists in code.**

---

## Duplicate Check

- BUG-062 (IMPLEMENTED): fixed the OPTIONS in the dropdown (content). This is about the CONTROL itself (interaction). **DISTINCT.**
- No other item touches source selector UX interaction.

---

## Evidence

- **Screenshot:** owner-provided — shows cramped dropdown, hard to open
- **Steps to reproduce:** Open Direct Dispatch → select destination → try clicking text area of any SOURCE (FEFO) dropdown (not the arrow) → dropdown may not open; on unchecked rows → click does nothing
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED

---

## Blast Radius

```bash
grep -rn "dispatch-source\|fefoAllocs\|batchedSegs" frontend/src/ | wc -l
```
→ ~8 lines, all in `DirectDispatchForm.jsx`.
- **Blast radius:** SMALL (1 file, 1 region ~22 lines)
- **Hotspot files:** DirectDispatchForm.jsx (HIGH-RISK per CI-R5) — view before editing
