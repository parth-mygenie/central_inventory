#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# HK 803 — Comprehensive Ops & Transfer Operations Test
# Tests: All ops settings, partial receive, reject, return, amend,
#        withdraw, modification, dispute, wastage, stock adjustment,
#        request flow, PO settings, selling price, shipping
# ══════════════════════════════════════════════════════════════════
set -uo pipefail
source /tmp/hk_env.sh
# Master segs: Chicken=568, Lamb=569, Pasta=570, Flour=571, Tomato=572, Olive=573, FG=580
# B inv: Chicken=18144, Pasta=18148, Lamb=18145, Flour=18143, Tomato=18149, Olive=18147
# C2 inv: Lamb=18152, Tomato=18156, Chicken=18151, Pasta=18155, Flour=18150, Olive=18154
# E inv: Flour=18157, Olive=18161, Chicken=18158

PASS=0; FAIL=0
check() { if [ "$1" = "true" ]; then echo "  ✅ $2"; ((PASS++)); else echo "  ❌ $2 — $3"; ((FAIL++)); fi; }

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION A: REPLENISH STOCK FOR TESTING                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
# Disable require_po temporarily for direct add-stock
curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/update" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":803,"settings":{"require_po_for_purchase":false}}' > /dev/null
for inv_vid in "18136:240" "18137:240" "18138:240" "18139:240" "18140:241" "18141:241"; do
  IFS=':' read -r inv vid <<< "$inv_vid"
  curl -s -X POST "$API/proxy/v2/inventory/add-stock/$inv" \
    -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
    -d "{\"quantity\":30,\"unit\":\"kg\",\"vendor_id\":$vid,\"payment_type\":\"cash\",\"purchase_date\":\"10-07-2026\",\"batch_number\":\"HK-RESTOCK-001\",\"expiry_date\":\"2027-06-30\"}" > /dev/null 2>&1
done
echo "Stock replenished (30kg each item, batch=HK-RESTOCK-001, exp=2027-06-30)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION B: OPS SETTING — require_po_for_purchase            ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- B1: require_po=true → direct add-stock blocked ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/update" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":803,"settings":{"require_po_for_purchase":true}}' > /dev/null
R=$(curl -s -X POST "$API/proxy/v2/inventory/add-stock/18136" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity":1,"unit":"kg","vendor_id":240,"payment_type":"cash","purchase_date":"10-07-2026"}')
CODE=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); errs=d.get('errors',[]); print(errs[0].get('code','') if errs else 'OK')" 2>/dev/null)
check "$([ "$CODE" = "DIRECT_PURCHASE_REQUIRES_PO" ] && echo true || echo false)" "require_po=true blocks direct add-stock" "$CODE"

echo "--- B2: require_po=false → direct add-stock allowed ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/update" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":803,"settings":{"require_po_for_purchase":false}}' > /dev/null
R=$(curl -s -X POST "$API/proxy/v2/inventory/add-stock/18136" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity":1,"unit":"kg","vendor_id":240,"payment_type":"cash","purchase_date":"10-07-2026","batch_number":"HK-TEST-PO","expiry_date":"2027-01-01"}')
OK=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('stock_id') or d.get('purchase_id') else 'false')" 2>/dev/null)
check "$OK" "require_po=false allows direct add-stock" ""

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION C: OPS — allow_child_direct_vendor_purchase         ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- C1: child_vendor_purchase=false → B blocked ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/update" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":803,"settings":{"allow_child_direct_vendor_purchase":false,"require_po_for_purchase":false}}' > /dev/null
R=$(curl -s -X POST "$API/proxy/v2/inventory/add-stock/18144" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity":1,"unit":"kg","vendor_id":240,"payment_type":"cash","purchase_date":"10-07-2026"}')
CODE=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); errs=d.get('errors',[]); print(errs[0].get('code','') if errs else d.get('Message','OK'))" 2>/dev/null)
check "$(echo $CODE | grep -qiE 'VENDOR_PURCHASE_NOT_ALLOWED|not allowed' && echo true || echo false)" "child_vendor=false blocks child add-stock" "$CODE"

echo "--- C2: child_vendor_purchase=true → B allowed ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/update" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":803,"settings":{"allow_child_direct_vendor_purchase":true}}' > /dev/null
R=$(curl -s -X POST "$API/proxy/v2/inventory/add-stock/18144" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity":5,"unit":"kg","vendor_id":240,"payment_type":"cash","purchase_date":"10-07-2026","batch_number":"B-LOCAL-001","expiry_date":"2027-01-01"}')
OK=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('stock_id') or d.get('purchase_id') else 'false')" 2>/dev/null)
check "$OK" "child_vendor=true allows child add-stock" "$(echo $R | head -c 100)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION D: OPS — allow_over_receive                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
# First create a small transfer to test over-receive
SEG=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/source-options" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"source_inventory_master_id":18138,"from_restaurant_id":803}' | python3 -c "import sys,json; segs=json.load(sys.stdin).get('data',{}).get('segments',[]); print(segs[0]['segment_id'] if segs else '')" 2>/dev/null)
T_OR=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"from_restaurant_id\":803,\"to_restaurant_id\":804,\"items\":[{\"source_inventory_master_id\":18138,\"quantity\":2,\"unit\":\"kg\",\"source_selector\":{\"mode\":\"segment_id\",\"segment_id\":$SEG}}]}")
T_OR_ID=$(echo "$T_OR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('transfer_id',''))" 2>/dev/null)
echo "Transfer for over-receive test: id=$T_OR_ID"

echo "--- D1: allow_over_receive=false → over-receive blocked ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/update" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":803,"settings":{"allow_over_receive":false}}' > /dev/null
# B receives with qty > dispatched
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/receive/$T_OR_ID" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d '{"receive_lines":[{"line_id":"auto","accepted_qty":5,"unit":"kg"}]}')
echo "  Over-receive attempt: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error_code',d.get('message',''))[:100])" 2>/dev/null)"

echo "--- D2: Normal receive (equal qty) ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/receive/$T_OR_ID" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d '{}')
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'received' in str(d.get('message',d.get('data',{}).get('transfer',{}).get('status',''))) else 'false')" 2>/dev/null)" "Normal receive works" ""

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION E: PARTIAL RECEIVE + DISPUTE                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
SEG=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/source-options" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"source_inventory_master_id":18139,"from_restaurant_id":803}' | python3 -c "import sys,json; segs=json.load(sys.stdin).get('data',{}).get('segments',[]); print(segs[0]['segment_id'] if segs else '')" 2>/dev/null)
T_PR=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"from_restaurant_id\":803,\"to_restaurant_id\":805,\"items\":[{\"source_inventory_master_id\":18139,\"quantity\":5,\"unit\":\"kg\",\"source_selector\":{\"mode\":\"segment_id\",\"segment_id\":$SEG}}]}")
T_PR_ID=$(echo "$T_PR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('transfer_id',''))" 2>/dev/null)
echo "Transfer for partial receive: id=$T_PR_ID"

echo "--- E1: C2 partial receive (accept 3 of 5, reject 2) ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/receive/$T_PR_ID" \
  -H "Authorization: Bearer $C2_TOKEN" -H "Content-Type: application/json" \
  -d '{"accept_full":false,"dispute":true,"dispute_note":"Only 3kg received, 2kg short"}')
echo "  Partial receive/dispute: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status',d.get('error_code','')))[:100])" 2>/dev/null)"

echo "--- E2: Check transfer detail for dispute status ---"
curl -s "$API/proxy/v2/inventory-transfer/details/$T_PR_ID" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
t = d.get('transfer',d)
print(f'  Status: {t.get(\"status\")}, dispute: {t.get(\"has_dispute\",t.get(\"dispute_status\",\"?\"))}')
" 2>/dev/null

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION F: REQUEST FLOW → APPROVE → REJECT                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- F1: Request sources (from C franchise) ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/request-sources" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" -d '{}' | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
sources = d.get('sources',d.get('data',[]))
if isinstance(sources,list):
    print(f'  Sources: {len(sources)}')
    for s in sources[:3]: print(f'    rid={s.get(\"restaurant_id\")}, name={s.get(\"restaurant_name\")}, can_submit={s.get(\"can_submit_request\")}')
" 2>/dev/null

echo "--- F2: Request catalog from B(804) ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/request-catalog" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" \
  -d '{"source_restaurant_id":804}' | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
items = d.get('items',d.get('data',[]))
if isinstance(items,list):
    print(f'  Catalog items: {len(items)}')
    for i in items[:4]: print(f'    inv={i.get(\"source_inventory_master_id\",i.get(\"id\"))}, title={i.get(\"stock_title\",i.get(\"title\"))}, qty={i.get(\"available_qty\",i.get(\"cal_quantity\"))}')
" 2>/dev/null

echo "--- F3: C requests stock from B ---"
# Need B's inventory master IDs for C's request
R_REQ=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" \
  -d '{"from_restaurant_id":804,"items":[{"source_inventory_master_id":18144,"stock_title":"Chicken","quantity":2,"unit":"kg"}]}')
REQ_ID=$(echo "$R_REQ" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('transfer_id',data.get('transfer',{}).get('id','')))" 2>/dev/null)
echo "  Request: id=$REQ_ID, $(echo "$R_REQ" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('status',d.get('error_code',d.get('message',''))))" 2>/dev/null)"

echo "--- F4: B approves request ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/approve/$REQ_ID" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d '{}')
echo "  Approve: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status','')))" 2>/dev/null)"

echo "--- F5: B dispatches approved request ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/dispatch/$REQ_ID" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d '{}')
echo "  Dispatch: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status','')))" 2>/dev/null)"

echo "--- F6: C receives ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/receive/$REQ_ID" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" -d '{}')
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'received' in str(d) else 'false')" 2>/dev/null)" "Request→Approve→Dispatch→Receive flow" ""

echo ""
echo "--- F7: New request from C → B (to test REJECT) ---"
R_REJ=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" \
  -d '{"from_restaurant_id":804,"items":[{"source_inventory_master_id":18148,"stock_title":"Pasta","quantity":1,"unit":"kg"}]}')
REJ_ID=$(echo "$R_REJ" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('transfer_id',d.get('data',{}).get('transfer',{}).get('id','')))" 2>/dev/null)
echo "  Reject-test request: id=$REJ_ID"

echo "--- F8: B REJECTS request ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/reject/$REJ_ID" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d '{"reject_reason":"Out of stock"}')
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'reject' in str(d).lower() else 'false')" 2>/dev/null)" "Request REJECTED by source" ""

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION G: AMEND + WITHDRAW + MODIFICATION                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- G1: C requests → AMEND (change qty) ---"
R_AMD=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" \
  -d '{"from_restaurant_id":804,"items":[{"source_inventory_master_id":18144,"stock_title":"Chicken","quantity":1,"unit":"kg"}]}')
AMD_ID=$(echo "$R_AMD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('transfer_id',d.get('data',{}).get('transfer',{}).get('id','')))" 2>/dev/null)
echo "  Request for amend: id=$AMD_ID"

R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request/$AMD_ID/amend" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" \
  -d '{"items":[{"source_inventory_master_id":18144,"stock_title":"Chicken","quantity":3,"unit":"kg"}]}')
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('status',True) != False else 'false')" 2>/dev/null)" "AMEND request (1kg→3kg)" "$(echo $R | head -c 100)"

echo "--- G2: WITHDRAW request ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request/$AMD_ID/withdraw" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" -d '{}')
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'withdraw' in str(d).lower() else 'false')" 2>/dev/null)" "WITHDRAW request (terminal)" ""

echo "--- G3: New request → approve → MODIFICATION ---"
R_MOD=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" \
  -d '{"from_restaurant_id":804,"items":[{"source_inventory_master_id":18144,"stock_title":"Chicken","quantity":1,"unit":"kg"}]}')
MOD_PARENT=$(echo "$R_MOD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('transfer_id',d.get('data',{}).get('transfer',{}).get('id','')))" 2>/dev/null)
echo "  Mod parent: id=$MOD_PARENT"
# B approves
curl -s -X POST "$API/proxy/v2/inventory-transfer/approve/$MOD_PARENT" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d '{}' > /dev/null

# C requests modification
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request/$MOD_PARENT/modification" \
  -H "Authorization: Bearer $C_TOKEN" -H "Content-Type: application/json" \
  -d '{"items":[{"source_inventory_master_id":18144,"stock_title":"Chicken","quantity":2,"unit":"kg"}]}')
MOD_CHILD=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('transfer_id',data.get('transfer',{}).get('id','')))" 2>/dev/null)
check "$([ -n "$MOD_CHILD" ] && [ "$MOD_CHILD" != "" ] && [ "$MOD_CHILD" != "None" ] && echo true || echo false)" "MODIFICATION request creates child transfer ($MOD_CHILD)" "$(echo $R | head -c 100)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION H: CANCEL TRANSFER                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
SEG=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/source-options" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"source_inventory_master_id":18137,"from_restaurant_id":803}' | python3 -c "import sys,json; segs=json.load(sys.stdin).get('data',{}).get('segments',[]); print(segs[0]['segment_id'] if segs else '')" 2>/dev/null)
T_CAN=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"from_restaurant_id\":803,\"to_restaurant_id\":806,\"items\":[{\"source_inventory_master_id\":18137,\"quantity\":1,\"unit\":\"kg\",\"source_selector\":{\"mode\":\"segment_id\",\"segment_id\":$SEG}}]}")
CAN_ID=$(echo "$T_CAN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('transfer_id',''))" 2>/dev/null)
echo "--- H1: Cancel dispatched transfer $CAN_ID ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/cancel/$CAN_ID" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"cancel_reason":"Testing cancel flow"}')
echo "  Cancel: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status',d.get('error_code',''))))" 2>/dev/null)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION I: STOCK ADJUSTMENT (Increase + Decrease)           ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- I1: Stock decrease (wastage-style) ---"
SEG=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/source-options" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"source_inventory_master_id":18140,"from_restaurant_id":803}' | python3 -c "import sys,json; segs=json.load(sys.stdin).get('data',{}).get('segments',[]); print(segs[0]['segment_id'] if segs else '')" 2>/dev/null)
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/decrease-adjustment" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"source_inventory_master_id\":18140,\"quantity\":1,\"unit\":\"kg\",\"reason\":\"Spoiled tomatoes\",\"restaurant_id\":803,\"source_selector\":{\"mode\":\"segment_id\",\"segment_id\":$SEG}}")
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('status',True)!=False else 'false')" 2>/dev/null)" "Stock DECREASE adjustment" "$(echo $R | head -c 150)"

echo "--- I2: Stock increase (found stock) ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory/add-stock/18140" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity":0.5,"unit":"kg","vendor_id":241,"payment_type":"cash","purchase_date":"10-07-2026","batch_number":"HK-ADJ-001","expiry_date":"2027-01-01","reason":"Found during stocktake"}')
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('stock_id') or d.get('purchase_id') else 'false')" 2>/dev/null)" "Stock INCREASE (add-stock)" ""

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION J: WASTAGE                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- J1: Get wastage reasons ---"
curl -s "$API/proxy/v2/inventory/wastage-reasons" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
reasons = d.get('reasons',d.get('data',[]))
print(f'  Reasons: {len(reasons)}')
for r in reasons: print(f'    id={r.get(\"id\")}, reason={r.get(\"reason\")}')
"

echo "--- J2: Record wastage ---"
SEG=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/source-options" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"source_inventory_master_id":18141,"from_restaurant_id":803}' | python3 -c "import sys,json; segs=json.load(sys.stdin).get('data',{}).get('segments',[]); print(segs[0]['segment_id'] if segs else '')" 2>/dev/null)
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/record-wastage" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"source_inventory_master_id\":18141,\"quantity\":0.5,\"unit\":\"ltr\",\"reason\":\"Spillage\",\"restaurant_id\":803,\"source_selector\":{\"mode\":\"segment_id\",\"segment_id\":$SEG}}")
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('status',True)!=False else 'false')" 2>/dev/null)" "Wastage recorded (Olive Oil 0.5ltr)" "$(echo $R | head -c 150)"

echo "--- J3: Wastage report ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory/wastage-report" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"start_date":"2026-07-10","end_date":"2026-07-10"}')
echo "  $(echo "$R" | python3 -c "
import sys,json; d=json.load(sys.stdin)
records = d.get('wastage_records',d.get('data',[]))
print(f'Wastage records: {len(records) if isinstance(records,list) else \"?\"}')
" 2>/dev/null)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION K: OPS — transfer_selling_price + shipping_fee      ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- K1: Transfer with selling_price + shipping_fee ---"
SEG=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/source-options" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"source_inventory_master_id":18136,"from_restaurant_id":803}' | python3 -c "import sys,json; segs=json.load(sys.stdin).get('data',{}).get('segments',[]); print(segs[0]['segment_id'] if segs else '')" 2>/dev/null)
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"from_restaurant_id\":803,\"to_restaurant_id\":804,\"shipping_fee\":50,\"items\":[{\"source_inventory_master_id\":18136,\"quantity\":2,\"unit\":\"kg\",\"selling_price\":300,\"source_selector\":{\"mode\":\"segment_id\",\"segment_id\":$SEG}}]}")
SP_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('transfer_id',''))" 2>/dev/null)
echo "  Transfer with price+shipping: id=$SP_ID, $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('status',d.get('error_code',d.get('message',''))))" 2>/dev/null)"

echo "--- K2: Verify selling_price on transfer detail ---"
if [ -n "$SP_ID" ] && [ "$SP_ID" != "" ] && [ "$SP_ID" != "None" ]; then
  curl -s "$API/proxy/v2/inventory-transfer/details/$SP_ID" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
t=d.get('transfer',d)
print(f'  shipping_fee={t.get(\"shipping_fee\")}, lines:')
for l in t.get('lines',[])[:2]: print(f'    {l.get(\"stock_title\")}: selling_price={l.get(\"selling_price\")}, qty={l.get(\"dispatched_qty\",l.get(\"quantity\"))}')
" 2>/dev/null
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION L: PARTIAL APPROVE + CANCEL REMAINDER               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
# D requests from C2
R_PA=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/request" \
  -H "Authorization: Bearer $D_TOKEN" -H "Content-Type: application/json" \
  -d '{"from_restaurant_id":805,"items":[{"source_inventory_master_id":18152,"stock_title":"Lamb","quantity":3,"unit":"kg"}]}')
PA_ID=$(echo "$R_PA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('transfer_id',d.get('data',{}).get('transfer',{}).get('id','')))" 2>/dev/null)
echo "--- L1: D requests 3kg Lamb from C2 → id=$PA_ID ---"

# Get line ID
LINE_ID=$(curl -s "$API/proxy/v2/inventory-transfer/details/$PA_ID" -H "Authorization: Bearer $C2_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
t=d.get('transfer',d)
lines=t.get('lines',[])
print(lines[0].get('id','') if lines else '')
" 2>/dev/null)
echo "  Line ID: $LINE_ID"

echo "--- L2: C2 partial approves (2 of 3kg, hold remainder) ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/approve/$PA_ID" \
  -H "Authorization: Bearer $C2_TOKEN" -H "Content-Type: application/json" \
  -d "{\"approval_lines\":[{\"line_id\":$LINE_ID,\"approved_display_qty\":2}],\"default_remainder_policy\":\"hold\"}")
echo "  Partial approve: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status',d.get('error_code',''))))" 2>/dev/null)"

echo "--- L3: Cancel remainder ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/approve/$PA_ID/cancel-remainder" \
  -H "Authorization: Bearer $C2_TOKEN" -H "Content-Type: application/json" \
  -d "{\"line_ids\":[$LINE_ID]}")
echo "  Cancel remainder: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('transfer',{}).get('status',d.get('error_code',''))))" 2>/dev/null)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION M: RETURN FLOW                                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- M1: Check return eligible (E, received T3) ---"
curl -s "$API/proxy/v2/inventory-transfer/return/eligible" \
  -H "Authorization: Bearer $E_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
data = d.get('data',{})
transfers = data.get('transfers',[])
print(f'  Eligible returns: {len(transfers)}')
for t in transfers[:3]: print(f'    id={t.get(\"id\")}, ref={t.get(\"reference_code\")}, from={t.get(\"from_restaurant_name\")}')
"

echo "--- M2: Attempt return initiate (if eligible) ---"
# E received transfer 261 from master — try to return
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/return/initiate" \
  -H "Authorization: Bearer $E_TOKEN" -H "Content-Type: application/json" \
  -d '{"original_transfer_id":261,"lines":[{"line_id":301,"quantity":1}]}')
echo "  Return initiate: $(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',d.get('data',{}).get('status',d.get('error_code',json.dumps(d)[:150]))))" 2>/dev/null)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION N: OPS — READONLY for children (G-027)              ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- N1: Child (B) tries to update ops settings → 403 ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/update" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":804,"settings":{"production_enabled":false}}')
CODE=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error_code',d.get('errors',[{}])[0].get('code','') if d.get('errors') else d.get('message','')))" 2>/dev/null)
check "$(echo $CODE | grep -qiE 'READONLY|forbidden|not allowed|403' && echo true || echo false)" "Child cannot update ops settings (G-027)" "$CODE"

echo "--- N2: Child reads resolved settings ---"
R=$(curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/get" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d '{"restaurant_id":804}')
check "$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); s=d.get('data',{}).get('settings',d.get('data',{}).get('resolved_settings',{})); print('true' if s.get('production_enabled')==True else 'false')" 2>/dev/null)" "Child reads inherited production_enabled=true" ""

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION O: CATALOG POLICY (G-029)                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- O1: Read catalog policy for B(804) ---"
curl -s "$API/proxy/v2/franchise/catalog-policy/804" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
p = d.get('resolved_policy',{})
print(f'  Policy for B(804):')
for k,v in p.items(): print(f'    {k}: {v}')
"

echo "--- O2: Master denies child catalog create ---"
curl -s -X POST "$API/proxy/v2/franchise/catalog-policy/804" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"policy":{"allow_child_catalog_create":false}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Set deny: {d.get(\"message\",d.get(\"data\",{}).get(\"resolved_policy\",{}).get(\"allow_child_catalog_create\",\"?\"))}')" 2>/dev/null

echo "--- O3: B tries to add food → blocked by policy ---"
R=$(curl -s -X POST "$API/proxy/v2/product/add-food" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Local Special","price":100,"category_id":8268}')
CODE=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); errs=d.get('errors',[]); print(errs[0].get('code','') if isinstance(errs,list) and errs else d.get('error_code',d.get('message','')))" 2>/dev/null)
check "$(echo $CODE | grep -qi 'CHILD_CATALOG_POLICY_DENIED' && echo true || echo false)" "Catalog policy denies child create (G-029)" "$CODE"

echo "--- O4: Restore allow ---"
curl -s -X POST "$API/proxy/v2/franchise/catalog-policy/804" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"policy":{"allow_child_catalog_create":true}}' > /dev/null

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION P: PUSHED CATALOG LOCK (G-028)                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- P1: B tries to delete pushed food → LOCKED ---"
# Get a pushed food ID on B
PUSHED_FOOD=$(curl -s "$API/proxy/v2/product/foods-list" -H "Authorization: Bearer $B_TOKEN" | python3 -c "
import sys,json
for f in json.load(sys.stdin).get('foods',[]):
    if f.get('is_pushed_managed'): print(f.get('id')); break
" 2>/dev/null)
echo "  Pushed food on B: $PUSHED_FOOD"
if [ -n "$PUSHED_FOOD" ]; then
  R=$(curl -s -X DELETE "$API/proxy/v2/product/delete/$PUSHED_FOOD" \
    -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
    -d '{"delete_reason":"test"}')
  CODE=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error_code',d.get('message','')))" 2>/dev/null)
  check "$(echo $CODE | grep -qi 'PUSHED_CATALOG_LOCKED' && echo true || echo false)" "Pushed food delete → LOCKED (G-028)" "$CODE"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECTION Q: STOCK LEDGER + DAILY CONSUMPTION                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "--- Q1: Stock ledger (master, today) ---"
curl -s -X POST "$API/proxy/v2/inventory-transfer/stock-ledger" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":803,"limit":5,"from_date":"2026-07-10"}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
if isinstance(d,list): entries=d
else: entries=d.get('data',{}).get('entries',d.get('data',[]))
if isinstance(entries,list):
    print(f'  Ledger: {len(entries)} entries')
    for e in entries[:5]: print(f'    [{e.get(\"source_type\")}] {e.get(\"direction\",\"?\")} {e.get(\"stock_title\",\"?\")} qty={e.get(\"quantity\",\"?\")}')
else: print(f'  Raw: {str(d)[:200]}')
"

echo "--- Q2: Daily consumption report ---"
curl -s -X POST "$API/proxy/v2/report/daily-consumption-report" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"from_date":"2026-07-10","to_date":"2026-07-10","include_hierarchy":true}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'  stock_summary: {len(d.get(\"stock_summary\",[]))} items')
print(f'  by_restaurant: {len(d.get(\"by_restaurant\",[]))} stores')
print(f'  hierarchy_scope: {d.get(\"hierarchy_scope\",[])}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  FINAL SCORE                                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "PASSED: $PASS"
echo "FAILED: $FAIL"
echo "TOTAL:  $((PASS+FAIL))"
