# G-031 — Reverse Push Backend Bug: `stock_items` Module Handler 500s

> **Type:** Open Gap (backend defect on `preprod.mygenie.online`)
> **Filed:** 2026-02-15 (QA of CR-045)
> **Reporter:** QA Agent + main agent curl re-verification
> **Affected CR:** CR-045 (Reverse Push Frontend Adoption)
> **Frontend status:** correct — errors surface via `data-testid="reverse-error"`
> **Blocker:** default wizard flow (leave-all-unchecked = push everything) always fails
> **Severity:** P1 (feature broken in default configuration; frontend can't work around it without contradicting owner spec)

---

## TL;DR

The POS reverse-push endpoint `POST /api/v2/vendoremployee/franchise/reverse-push/from/{childId}` **500s deterministically when the `stock_items` module is included** (either explicitly or implicitly via the omit-modules default).

**All other reported "always-fail" cases in the initial QA report are downstream of this one bug:**
- ✅ Full-bundle default → fails because implicit stock_items
- ✅ `enforce_child_lock: true` on full bundle → fails because implicit stock_items
- ✅ `enforce_child_lock: true` + explicit 8-module list → fails because explicit stock_items
- ❌ `enforce_child_lock: true` in isolation (with a partial list excluding stock_items) → **works fine** (initial QA report claim disproved)

**Reproducible fault module: `stock_items` only.**

---

## Reproduction

Test hierarchy: master **809** (bhole chature) ← franchise **689** (Kunafa Mahal).
Token minted via `POST /api/proxy/auth/login` with `owner@bholechature.com` / `Qplazm@10`.

Base URL: `https://repo-deploy-74.preview.emergentagent.com/api/proxy/v2/franchise/reverse-push/from/689`
Header: `Authorization: Bearer <master_token>` · `Content-Type: application/json`

### Failing payloads (all deterministic across retries)

| # | Payload | Result |
|:-:|---------|:------:|
| **F1** | `{"push_food_bundle": true, "enforce_child_lock": false}` (no `modules` — omit-default = "push everything") | **HTTP 500** body `Internal Server Error` |
| **F2** | `{"push_food_bundle": true, "enforce_child_lock": false, "modules": ["stock_items"]}` | **HTTP 500** body `Internal Server Error` |
| **F3** | `{"push_food_bundle": true, "enforce_child_lock": true}` (full bundle + lock) | **HTTP 500** body `Internal Server Error` |
| **F4** | `{"push_food_bundle": true, "enforce_child_lock": true, "modules": ["categories","stock_item_categories","addons","sub_recipes","ingredients","stock_items","foods","recipes"]}` (all 8 explicit + lock) | **HTTP 500** body `Internal Server Error` |

The 500 body is the string `Internal Server Error` (plain text, not JSON) with no `error_code` field — meaning it never reached Laravel's structured error handler.

### Passing payloads (control set)

| # | Payload | Result |
|:-:|---------|:------:|
| P1 | `modules: ["categories"]` | 200 `updated:23` |
| P2 | `modules: ["foods"]` | 200 `updated:98` |
| P3 | `modules: ["categories","foods"]` | 200 |
| P4 | `modules: ["categories","ingredients"]` | 200 |
| P5 | `modules: ["addons"]` | 200 `updated:10` |
| P6 | `modules: ["addons","recipes"]` | 200 |
| P7 | `modules: ["ingredients"]` | 200 `updated:105` |
| P8 | `modules: ["ingredients","recipes"]` | 200 |
| P9 | `modules: ["sub_recipes"]` | 200 |
| P10 | `modules: ["stock_item_categories"]` | 200 `updated:70` |
| **P11** | `modules: ["categories"], enforce_child_lock: true` | **200** (disproves "enforce_child_lock:true always fails") |

**Every payload that omits `stock_items` succeeds.** Every payload that includes `stock_items` (explicit OR implicit via omit-default) fails.

### Exact curl reproduction (F1 — the wizard's default path)

```bash
TM=$(curl -s -X POST "https://repo-deploy-74.preview.emergentagent.com/api/proxy/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bholechature.com","password":"Qplazm@10"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -sS -X POST \
  "https://repo-deploy-74.preview.emergentagent.com/api/proxy/v2/franchise/reverse-push/from/689" \
  -H "Authorization: Bearer $TM" \
  -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true, "enforce_child_lock": false}' \
  -w "\nHTTP %{http_code}\n"
```

Actual output:

```
Internal Server Error
HTTP 500
```

### Exact curl reproduction (F2 — isolate stock_items)

```bash
curl -sS -X POST \
  "https://repo-deploy-74.preview.emergentagent.com/api/proxy/v2/franchise/reverse-push/from/689" \
  -H "Authorization: Bearer $TM" \
  -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true, "enforce_child_lock": false, "modules": ["stock_items"]}' \
  -w "\nHTTP %{http_code}\n"
```

Actual output:

```
Internal Server Error
HTTP 500
```

---

## Impact on CR-045 wizard

- **Wizard default flow (no module checkboxes ticked):** BROKEN — frontend correctly renders `reverse-error` toast with the backend message.
- **Wizard with any manual module selection excluding `stock_items`:** WORKS.
- **Enforce Child Lock checkbox:** SAFE when combined with a partial module list; UNSAFE when combined with full bundle (because stock_items is implicit).

Frontend UX is correct. The blocker is external.

---

## Additional preview inconsistency (minor)

`GET /franchise/reverse-push-form/from/689` reports `push_summary.breakdown.<module>.child_matched: 0` for every module — even for modules where POST subsequently returns `updated:N` (proving same-name records DO exist at target).

So the preview's "behind" badges are inflated: everything appears to be "to insert" when in reality most will merge.

This is a separate backend defect on the GET side. Not blocking, but users see misleading counts.

---

## Recommended actions

### For POS backend team
1. **Fix `stock_items` module handler in reverse-push controller.** Every other module works — this one alone crashes. Likely a null pointer / missing join / typo in the recent controller ship.
2. **Fix `GET reverse-push-form/from/{childId}` breakdown** to populate `child_matched` correctly via name-match against the target restaurant's records.
3. Confirm plain-text `Internal Server Error` body is intended for 500s (structured JSON with `error_code` would help frontends surface actionable messages).

### For frontend (CR-045)
No code change recommended. Frontend follows owner spec exactly:
- Default modules = omit = push everything (spec)
- Error handler surfaces backend message (spec)

**Options if owner wants to unblock the default flow before backend fixes:**
- **W1** — Modify `api.reversePushFromChild` default to explicitly send 7 modules (all except stock_items). Users lose stock_items pull capability until backend fix. Contradicts owner spec §7-Q6 ("Default = omit modules = push everything").
- **W2** — Add a warning banner in the wizard when the user leaves all modules unchecked, explaining the stock_items backend bug.
- **W3** — Wait for backend fix. Ship the wizard as-is; users see accurate error toast until B1 is resolved.

---

## Evidence

- Live curl session: `/tmp/A.json` (F1 response body), `/tmp/B.txt`, `/tmp/C.txt`, `/tmp/D.txt`, `/tmp/E.txt`, `/tmp/F.txt`, `/tmp/G.txt`, `/tmp/H.txt`, `/tmp/I.txt`, `/tmp/x.txt` — reproduction outputs
- Testing agent report: `/app/test_reports/iteration_58.json` (initial QA that surfaced the bug but misattributed enforce_child_lock as a separate cause)
- CR-045 code-gate: `control/sessions/CR045_ARTIFACT_4_CODE_GATE.md`

---

## Status

| Field | Value |
|-------|-------|
| Frontend fix required? | NO (following owner spec exactly) |
| Backend fix required? | YES — POS team |
| ETA from POS | Unknown |
| Blocks CR-045 signoff? | Partial — default flow unusable; manual module selection works |
| Recommended CR-045 status | `IMPLEMENTED + BLOCKED_BY_G031` until backend fix |
