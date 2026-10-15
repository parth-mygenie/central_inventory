#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# Heaven Garden — Phase 6: Production, Push, Transfers, New Endpoints
# Date: 2026-07-10
# ══════════════════════════════════════════════════════════════════
set -uo pipefail
API="https://43de4f14-15c0-4614-bd13-9137aa93ff9d.preview.emergentagent.com/api"
PASSWORD="Qplazm@10"

MASTER_TOKEN=$(curl -s -X POST "$API/proxy/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"owner@heavengarden.com\",\"password\":\"$PASSWORD\",\"fcm_token\":\"test\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
echo "Master Token: ${MASTER_TOKEN:0:30}..."

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 6A: PRODUCTION RUN                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Manufactured recipe: Masala Chai, sub_recipe_id=187, fg_inventory_master_id=18114
echo "=== 6A.1: Production Run — Masala Chai (sub_recipe_id=187) ==="
PROD=$(curl -s -X POST "$API/proxy/v2/inventory/production-run/complete" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "sub_recipe_id":187,
    "quantity":5,
    "unit":"batch",
    "batch":"HG-CHAI-BATCH-001",
    "expiry_date":"20-07-2026"
  }')
echo "$PROD" | python3 -c "
import sys,json; d=json.load(sys.stdin)
run = d.get('data',d)
print(f'Run ID: {run.get(\"id\",run.get(\"production_run_id\",\"?\"))}')
print(f'Reference: {run.get(\"reference_code\",\"?\")}')
print(f'Status: {run.get(\"status\",\"?\")}')
print(f'Output qty: {run.get(\"output_quantity\",\"?\")} {run.get(\"output_unit\",\"?\")}')
" 2>/dev/null || echo "$PROD" | head -30

echo ""
echo "=== 6A.2: Production History ==="
curl -s "$API/proxy/v2/inventory/production-run" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
data = d.get('data',d)
runs = data.get('production_runs', data) if isinstance(data, dict) else data
if not isinstance(runs, list): runs = [runs]
print(f'Production runs: {len(runs)}')
for r in runs:
    if isinstance(r, dict):
        print(f'  id={r.get(\"id\")}, ref={r.get(\"reference_code\")}, recipe={r.get(\"sub_recipe_name\",r.get(\"sub_recipe\",{}).get(\"name\",\"?\"))}, qty={r.get(\"output_quantity\")}, status={r.get(\"status\")}')
" 2>/dev/null

echo ""
echo "=== 6A.3: Stock After Production ==="
curl -s "$API/proxy/v2/inventory/stock-inventory" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
stocks = d.get('data',{}).get('current_stocks',d.get('current_stocks',[]))
if not isinstance(stocks, list): stocks = []
for s in stocks:
    print(f'  {s.get(\"stock_title\")}: qty={s.get(\"cal_quantity\")} {s.get(\"unit\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 6B: PUSH BUNDLES TO CHILDREN                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Children: B=800, C2=801, E=802
echo "=== 6B.1: Push bundle to B (Central RID 800) ==="
curl -s -X POST "$API/proxy/v2/franchise/push/800" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"push_food_bundle":true}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
results = d.get('data',{}).get('results',d.get('results',{}))
print(f'Push to B(800): categories={results.get(\"categories\",{})}, ingredients={results.get(\"ingredients\",{})}, foods={results.get(\"foods\",{})}, recipes={results.get(\"recipes\",{})}')
" 2>/dev/null || echo "Push B done"

echo ""
echo "=== 6B.2: Push bundle to C2 (Central RID 801) ==="
curl -s -X POST "$API/proxy/v2/franchise/push/801" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"push_food_bundle":true}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
results = d.get('data',{}).get('results',d.get('results',{}))
print(f'Push to C2(801): categories={results.get(\"categories\",{})}, ingredients={results.get(\"ingredients\",{})}, foods={results.get(\"foods\",{})}, recipes={results.get(\"recipes\",{})}')
" 2>/dev/null || echo "Push C2 done"

echo ""
echo "=== 6B.3: Push bundle to E (Franchise RID 802) ==="
curl -s -X POST "$API/proxy/v2/franchise/push/802" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"push_food_bundle":true}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
results = d.get('data',{}).get('results',d.get('results',{}))
print(f'Push to E(802): categories={results.get(\"categories\",{})}, ingredients={results.get(\"ingredients\",{})}, foods={results.get(\"foods\",{})}, recipes={results.get(\"recipes\",{})}')
" 2>/dev/null || echo "Push E done"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 6C: TRANSFERS (Multiple Directions)                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Get inventory master IDs for transfers
# Master (799) has: 18108(Cumin), 18109(Turmeric), 18110(Milk), 18111(Paneer), 18112(Rice), 18113(Flour)
# Children need inventory at their restaurants too - pushed items will have different IDs

echo "=== 6C.1: Transfer Master(799) → Central B(800) — Direct Dispatch ==="
T1=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "from_restaurant_id":799,
    "to_restaurant_id":800,
    "items":[
      {"source_inventory_master_id":18112,"stock_title":"Rice","quantity":5,"unit":"kg"},
      {"source_inventory_master_id":18113,"stock_title":"Flour","quantity":3,"unit":"kg"},
      {"source_inventory_master_id":18111,"stock_title":"Paneer","quantity":2,"unit":"kg"}
    ]
  }')
T1_ID=$(echo "$T1" | python3 -c "
import sys,json; d=json.load(sys.stdin)
data = d.get('data',d)
tid = data.get('transfer',{}).get('id') or data.get('transfer_id') or data.get('id')
print(tid or '')
status = data.get('transfer',{}).get('status') or data.get('status')
print(f'Transfer 1 (A→B): id={tid}, status={status}', file=__import__('sys').stderr)
" 2>/dev/null)
T1_ID=$(echo "$T1_ID" | head -1)
echo "Transfer 1 ID: $T1_ID"

echo ""
echo "=== 6C.1b: Dispatch Transfer 1 ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/dispatch/$T1_ID" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Dispatch: {d.get(\"data\",{}).get(\"transfer\",{}).get(\"status\",d.get(\"message\",\"?\"))}')" 2>/dev/null

echo ""
echo "=== 6C.2: Transfer Master(799) → Central C2(801) — Direct Dispatch ==="
T2=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "from_restaurant_id":799,
    "to_restaurant_id":801,
    "items":[
      {"source_inventory_master_id":18108,"stock_title":"Cumin Seeds","quantity":1,"unit":"kg"},
      {"source_inventory_master_id":18109,"stock_title":"Turmeric Powder","quantity":0.5,"unit":"kg"},
      {"source_inventory_master_id":18112,"stock_title":"Rice","quantity":5,"unit":"kg"}
    ]
  }')
T2_ID=$(echo "$T2" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',d); print(data.get('transfer',{}).get('id') or data.get('transfer_id') or data.get('id') or '')" 2>/dev/null)
echo "Transfer 2 (A→C2) ID: $T2_ID"

echo "=== Dispatch T2 ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/dispatch/$T2_ID" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Dispatch: {d.get(\"data\",{}).get(\"transfer\",{}).get(\"status\",d.get(\"message\",\"?\"))}')" 2>/dev/null

echo ""
echo "=== 6C.3: Transfer Master(799) → Franchise E(802) — Direct Dispatch ==="
T3=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "from_restaurant_id":799,
    "to_restaurant_id":802,
    "items":[
      {"source_inventory_master_id":18112,"stock_title":"Rice","quantity":3,"unit":"kg"},
      {"source_inventory_master_id":18110,"stock_title":"Milk","quantity":5,"unit":"ltr"}
    ]
  }')
T3_ID=$(echo "$T3" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',d); print(data.get('transfer',{}).get('id') or data.get('transfer_id') or data.get('id') or '')" 2>/dev/null)
echo "Transfer 3 (A→E) ID: $T3_ID"
echo "=== Dispatch T3 ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/dispatch/$T3_ID" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Dispatch: {d.get(\"data\",{}).get(\"transfer\",{}).get(\"status\",d.get(\"message\",\"?\"))}')" 2>/dev/null

echo ""
echo "=== 6C.4: Transfer Master(799) → Central B(800) → Franchise C (via B's token) ==="
echo "[NOTE: Cannot login as B/C2 accounts — POS API limitation for newly created hierarchy children]"
echo "[Attempting from master token for B→C transfer]"

# Try Central B → Franchise C (but we only have master token)
# This might fail because master doesn't own Central B's stock
T4=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "from_restaurant_id":800,
    "to_restaurant_id":802,
    "items":[
      {"source_inventory_master_id":18112,"stock_title":"Rice","quantity":1,"unit":"kg"}
    ]
  }')
echo "T4 (B→E cross): $(echo "$T4" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status','?')))" 2>/dev/null)"
T4_ID=$(echo "$T4" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',d); print(data.get('transfer',{}).get('id') or data.get('transfer_id') or data.get('id') or '')" 2>/dev/null)
if [ -n "$T4_ID" ] && [ "$T4_ID" != "None" ]; then
  echo "T4 ID: $T4_ID — dispatching..."
  curl -s -X POST "$API/proxy/v2/inventory-transfer/dispatch/$T4_ID" \
    -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Dispatch: {d.get(\"data\",{}).get(\"transfer\",{}).get(\"status\",d.get(\"message\",\"?\"))}')" 2>/dev/null
fi

echo ""
echo "=== 6C.5: Cross-central transfer: Master(799) dispatching B(800)→C2(801) ==="
T5=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "from_restaurant_id":800,
    "to_restaurant_id":801,
    "items":[
      {"source_inventory_master_id":18112,"stock_title":"Rice","quantity":1,"unit":"kg"}
    ]
  }')
echo "T5 (B→C2): $(echo "$T5" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status','?')))" 2>/dev/null)"

echo ""
echo "=== 6C.6: Transfer History ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/history" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"limit":20}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
data = d.get('data',d)
transfers = data if isinstance(data, list) else data.get('transfers',data.get('data',[]))
if not isinstance(transfers, list): transfers = [transfers]
print(f'Transfer history: {len(transfers)} records')
for t in transfers:
    if isinstance(t, dict):
        print(f'  id={t.get(\"id\")}, ref={t.get(\"reference_code\")}, from={t.get(\"from_restaurant_name\",\"?\")}, to={t.get(\"to_restaurant_name\",\"?\")}, status={t.get(\"status\")}, type={t.get(\"type\")}')
"

echo ""
echo "=== 6C.7: Pending Queues ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/pending-queues" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
data = d.get('data',d)
for queue_name in ['approval_pending','dispatch_pending','receive_pending','my_requests']:
    q = data.get(queue_name,[])
    if isinstance(q, list) and len(q) > 0:
        print(f'{queue_name}: {len(q)} items')
        for t in q[:3]:
            print(f'  id={t.get(\"id\")}, ref={t.get(\"reference_code\")}, status={t.get(\"status\")}')
    else:
        print(f'{queue_name}: 0 items')
"

echo ""
echo "=== 6C.8: Final Stock After All Transfers ==="
curl -s "$API/proxy/v2/inventory/stock-inventory" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
stocks = d.get('data',{}).get('current_stocks',d.get('current_stocks',[]))
if not isinstance(stocks, list): stocks = []
print('Master (799) Final Stock:')
for s in stocks:
    print(f'  {s.get(\"stock_title\")}: qty={s.get(\"cal_quantity\")} {s.get(\"unit\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 6D: NEW ENDPOINT TESTS (validation-6-7)              ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== 6D.1: GET PO receive-import-template ==="
curl -s -o /dev/null -w "HTTP %{http_code}, Size: %{size_download} bytes\n" \
  "$API/proxy/v2/inventory/purchase-order/28/receive-import-template" \
  -H "Authorization: Bearer $MASTER_TOKEN"

echo "=== 6D.2: POST PO parse-receive-import ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/28/parse-receive-import" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:300])" 2>/dev/null

echo ""
echo "=== 6D.3: GET PO import-template (general) ==="
curl -s -o /dev/null -w "HTTP %{http_code}, Size: %{size_download} bytes\n" \
  "$API/proxy/v2/inventory/purchase-order/import-template" \
  -H "Authorization: Bearer $MASTER_TOKEN"

echo "=== 6D.4: POST parse-import (general) ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/parse-import" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:300])" 2>/dev/null

echo ""
echo "=== 6D.5: POST check-invoice-number (existing) ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/check-invoice-number" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"vendor_id":238,"invoice_number":"INV-HG-001"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:300])" 2>/dev/null

echo ""
echo "=== 6D.6: POST check-invoice-number (new/available) ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/check-invoice-number" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"vendor_id":238,"invoice_number":"INV-UNIQUE-999"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:300])" 2>/dev/null

echo ""
echo "=== 6D.7: POST stock-ledger ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/stock-ledger" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":799,"limit":10}' \
  | python3 -c "
import sys,json; d=json.load(sys.stdin)
data = d.get('data',d)
entries = data.get('entries',data.get('data',[]))
if isinstance(entries, list):
    print(f'Stock ledger entries: {len(entries)}')
    for e in entries[:5]:
        print(f'  [{e.get(\"source_type\")}] {e.get(\"direction\",\"?\")} ref={e.get(\"reference_code\",\"?\")} title={e.get(\"stock_title\",\"?\")} qty={e.get(\"quantity\",\"?\")}')
else:
    print(json.dumps(d, indent=2)[:500])
" 2>/dev/null

echo ""
echo "=== 6D.8: GET return/eligible ==="
curl -s "$API/proxy/v2/inventory-transfer/return/eligible" \
  -H "Authorization: Bearer $MASTER_TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:300])" 2>/dev/null

echo ""
echo "=== 6D.9: GET franchise/catalog-policy/800 (G-029) ==="
curl -s "$API/proxy/v2/franchise/catalog-policy/800" \
  -H "Authorization: Bearer $MASTER_TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])" 2>/dev/null

echo ""
echo "=== 6D.10: POST franchise/catalog-policy/800 — deny child create (G-029) ==="
curl -s -X POST "$API/proxy/v2/franchise/catalog-policy/800" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"policy":{"allow_child_catalog_create":false}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])" 2>/dev/null

echo ""
echo "=== 6D.11: GET wastage-reasons/list ==="
curl -s "$API/proxy/v2/inventory/wastage-reasons" \
  -H "Authorization: Bearer $MASTER_TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); reasons=d.get('reasons',d.get('data',[])); print(f'Wastage reasons: {len(reasons) if isinstance(reasons,list) else \"?\"}'); [print(f'  {r}') for r in (reasons[:5] if isinstance(reasons,list) else [])]" 2>/dev/null

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "PHASE 6 COMPLETE"
echo "══════════════════════════════════════════════════════════════"
