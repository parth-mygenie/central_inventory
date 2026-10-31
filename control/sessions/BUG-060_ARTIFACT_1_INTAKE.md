# BUG-060 — ARTIFACT 1: INTAKE
> **ID:** BUG-060
> **Title:** Dispatch — Multi-Batch Source Selection Not Wired (FEFO multi-alloc broken)
> **Date:** 2026-10-20
> **Severity:** P2 — MEDIUM
> **Source:** OWNER-REPORTED (screenshot: Apple showing 2 FEFO batches)
> **Confidence:** CONFIRMED (code trace) + API contract UNKNOWN (probe needed)

---

## Description
Owner: "when dispatching, if I want to select 5kg from one batch and 5kg from another batch —
is that possible?"

FEFO auto-select already computes multi-batch allocations (e.g. AME-19OCT26-1148: 5kg + APP-19OCT26-1528: 5kg)
and renders multiple source rows in the UI. But the dispatch payload only sends a SINGLE
`source_selector` — the multi-alloc data is never sent to the API.

## Root Cause (Two Layers)

**Layer 1 — Frontend (confirmed):**
- `autoSource = fefoAllocs.length === 1 ? {segment_id} : null` (line 221)
- When multi-alloc → `sourceSelector = null` on the row
- Each alloc's `<select>` `onChange` overwrites `row.sourceSelector` to a single `{segment_id}` (line 788)
- Payload: `source_selector: r.sourceSelector` = null or single → multi-alloc silently dropped

**Layer 2 — API contract (unknown):**
- Current contract: `items: [{source_inventory_master_id, quantity, unit, source_selector: {mode, segment_id}}]`
- Two fix options:
  - **Option B** (preferred if API allows): send same `source_inventory_master_id` TWICE in `items[]` with different `source_selector` + qty per alloc
  - **Option A** (needs backend change): `source_selector` as array `[{segment_id, qty}, ...]` — not in any API docs

## Evidence
- Code: `DirectDispatchForm.jsx` lines 219–222 (autoSource=null), 782–799 (multi-select UI), 325–330 (payload)
- API docs: single `source_selector` in all validated contracts (P28 smoke validation)
- Screenshot: Apple row shows AME + APP batch dropdowns in FEFO section

## Steps to Reproduce
1. Login as `owner@mygenietest002.com` → /dispatch/new → select Mygenietest001 (Outlet)
2. Find Apple (10 kg avail, 2 FEFO batches)
3. Enter qty > one batch size (e.g. 15 kg)
4. Source column shows 2 FEFO rows but:
   - sourceSelector = null (can't dispatch)
   - No way to split qty between batches

## Blast Radius
- Files: 1 (`DirectDispatchForm.jsx`)
- Scope: MEDIUM (payload builder logic + source display UI)
- Hotspot files: NO

## Duplicate Check
Related: BUG-006 (filter_bucket failing on batched stock — ACCEPTED/LOW). Distinct issue.
Related: CR-050 (FEFO multi-alloc scaffolded but not wired to payload). This bug completes CR-050 scope.

## Pre-Planning Action Required
Before PLANNING can begin: **API probe** — attempt a dispatch with `items` containing the same
`source_inventory_master_id` twice (different `source_selector` + reduced qty each).
Run in dev env. Observe API: 200 accepted OR 4xx rejected.
If rejected → file G-040 in L9 and scope frontend to show warning + send total qty with null source_selector.

## Open Questions
1. Does the POS API accept duplicate `source_inventory_master_id` in the `items[]` array?
2. If yes: should we auto-split (FEFO-computed) or let storekeeper manually split?
