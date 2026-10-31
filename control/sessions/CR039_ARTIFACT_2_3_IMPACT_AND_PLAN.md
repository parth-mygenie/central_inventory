# CR-039 — Procurement Excel/CSV Import (G-015)

> **Gates:** 2 + 3 combined | **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` — G-015 FULLY RESOLVED (template + parse endpoints live)
> **Code Reality:** PARTIAL — `AddStockPurchaseForm.jsx` lines 286-310 has a dead Excel upload zone ("Excel parsing requires backend setup (G-015)"). No api.js methods. **Proxy cannot pass files** (JSON-only).

---

## 1. Impact Analysis (Gate 2)

### What backend now provides (verified 2026-07-07)
1. `GET /inventory/purchase-order/import-template` → 200, 11,781-byte `.xlsx` binary
2. `POST /inventory/purchase-order/parse-import` (multipart, `file` field) → 422 `{code:"VALIDATION_FAILED", errors:{file:["required"]}}` without file. **Successful parse response shape NOT captured — R9 probe with the actual template file required before wiring the preview UI.**

### BLOCKER — proxy transport gap
`backend/server.py` `proxy_v2` (lines 130-165) only forwards JSON bodies and returns `resp.json()`. It can neither forward `multipart/form-data` nor return binary content.
- **This is a transport change, not business logic** — permitted under CI-R2, BUT `server.py` is policy-frozen → **requires explicit owner approval at Gate 4**.
- Approach: 2 dedicated passthrough routes (scoped; zero risk to existing generic proxy).

### Affected files

| File | Change | Risk |
|------|--------|:---:|
| `backend/server.py` | +2 routes: binary GET passthrough (template), multipart POST passthrough (parse) | MEDIUM (frozen-by-policy, owner GO required) |
| `frontend/src/services/api.js` | +2 methods: `getPOImportTemplate` (blob), `parsePOImport` (FormData) | LOW |
| `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` | Wire lines 286-310: template download btn, file input → parse → parsed-rows preview → hand off to PO create | MEDIUM |
| `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` | Accept pre-filled lines via navigation state (`location.state.importedLines`) | LOW |

### Conflict pre-check
- `PurchaseOrderCreate.jsx`: BUG-039/043/044 (QA_PASS, not closed) touched it. Additive (read `location.state`) → parallel-safe, but **execute after BUG-038→045 close** to avoid QA churn.
- `AddStockPurchaseForm.jsx`: last touched CR-030 (PO gate redirect). Clear.

### Open Questions (owner)
1. **Gate 4 must explicitly approve the server.py transport edits** (policy-frozen file).
2. After parse: feed rows into PO Create (recommended) or directly create stock purchases? Parse response shape unknown until probed — final preview UI is contingent on probe.
3. Max file size limit (UI says 5MB) — keep 5MB client-side check?

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — server.py: template passthrough (after proxy_v2, ~line 166)**
```python
# CR-039 — G-015 binary template download passthrough
from fastapi.responses import Response as RawResponse

@api_router.get("/proxy/v2/inventory/purchase-order/import-template")
async def proxy_import_template(request: Request):
    headers = {"Accept": "*/*"}
    if request.headers.get("Authorization"):
        headers["Authorization"] = request.headers["Authorization"]
    async with httpx.AsyncClient(timeout=60.0) as http:
        resp = await http.get(f"{PREPROD_V2}/inventory/purchase-order/import-template", headers=headers)
    return RawResponse(content=resp.content, status_code=resp.status_code,
                       media_type=resp.headers.get("content-type", "application/octet-stream"),
                       headers={"Content-Disposition": resp.headers.get("content-disposition", "attachment; filename=po_import_template.xlsx")})
```
Note: route registered BEFORE generic `/proxy/v2/{path:path}`? FastAPI matches more-specific literal routes first regardless of order in same router — verify at self-test; if shadowed, register above proxy_v2 in file.

**Edit 2 — server.py: multipart passthrough**
```python
# CR-039 — G-015 multipart parse-import passthrough
@api_router.post("/proxy/v2/inventory/purchase-order/parse-import")
async def proxy_parse_import(request: Request):
    headers = {"Accept": "application/json"}
    if request.headers.get("Authorization"):
        headers["Authorization"] = request.headers["Authorization"]
    form = await request.form()
    upload = form.get("file")
    files = {"file": (upload.filename, await upload.read(), upload.content_type)} if upload else None
    async with httpx.AsyncClient(timeout=60.0) as http:
        resp = await http.post(f"{PREPROD_V2}/inventory/purchase-order/parse-import", headers=headers, files=files)
    try: content = resp.json()
    except Exception: content = {"raw": resp.text}
    return JSONResponse(content=content, status_code=resp.status_code)
```
Requires `python-multipart` (verify installed; add via pip + `pip freeze > requirements.txt` if missing).

**Edit 3 — api.js: +2 methods (after `addStockPurchase`, ~line 688)**
```js
// CR-039 — G-015 excel import
function getPOImportTemplate() {
  return client.get("/proxy/v2/inventory/purchase-order/import-template", { responseType: "blob" });
}
function parsePOImport(file) {
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/proxy/v2/inventory/purchase-order/parse-import", fd,
    { headers: { "Content-Type": "multipart/form-data" } });
}
```
Export both.

**Edit 4 — AddStockPurchaseForm.jsx (lines 286-310).** Replace dead zone: `[Download Template]` button (blob → `URL.createObjectURL` download); file input `onChange` → 5MB check → `parsePOImport` → loading → render parsed-rows preview table (columns per probed response) with per-row validation errors → `[Continue to PO Create]` navigates `/purchase/orders/new` with `state.importedLines`. Remove the "requires backend setup (G-015)" notice (line 309).

**Edit 5 — PurchaseOrderCreate.jsx.** On mount: `location.state?.importedLines` → pre-fill By Vendor mode lines. Guard nulls.

### Execution sequence
R9 probe (parse with real template file → capture shape) → server.py routes + `sudo supervisorctl restart backend` → curl both proxied routes → api.js → AddStockPurchaseForm → PurchaseOrderCreate.

### Scope lock
- **WILL change:** `server.py` (owner-approved), `api.js`, `AddStockPurchaseForm.jsx`, `PurchaseOrderCreate.jsx`, `requirements.txt` (if python-multipart missing)
- **Will NOT touch:** generic `proxy_v2` handler, invoice OCR tab (G-024 still open — "Coming Soon" stays), any other screen

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | server.py | template passthrough | curl -o /tmp/t.xlsx via preview URL → valid xlsx ~11KB | YES |
| 2 | server.py | multipart passthrough | curl -F file=@/tmp/t.xlsx → parsed JSON (or 422 without file) | YES |
| 3 | AddStockPurchaseForm | download + parse UI | Browser: download works, upload shows preview rows | NO |
| 4 | POCreate | prefill | Continue → lines pre-filled | NO |
| 5 | regression | generic proxy intact | curl `/api/proxy/v2/inventory/get-vendor` → 200 | YES |

### Post-code registry checklist
- [ ] registry.json: CR-039 → IMPLEMENTED · L3 · L7 (incl. server.py note) · `// CR-039` + `# CR-039` markers · dashboard `--check` PASS
