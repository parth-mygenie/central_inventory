#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# Heaven Garden — Phase 3-6: Recipes, Vendors, PO, Production, Transfers
# Date: 2026-07-10
# ══════════════════════════════════════════════════════════════════
# Hierarchy:
#   A (Master RID 799) — owner@heavengarden.com
#   B (Central RID 800) — central_b@heavengarden.com [login pending]
#   C2 (Central RID 801) — central_c2@heavengarden.com [login pending]
#   E (Franchise RID 802) — franchise_e@heavengarden.com [login pending]
#
# Inventory IDs: 18108(Cumin), 18109(Turmeric), 18110(Milk), 18111(Paneer), 18112(Rice), 18113(Flour)
# Food IDs: 215436(Paneer Tikka Masala), 215437(Jeera Rice), 215438(Butter Naan), 215439(Masala Chai)
# Stock Categories: 1513(Spices), 1514(Dairy), 1515(Dry Goods)
# Food Categories: 8256(Main Course), 8257(Breads), 8258(Beverages)
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
echo "║  PHASE 3: RECIPES (Regular + Manufactured → Auto Sub-Recipe) ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== 3.1: Regular Recipe for Jeera Rice (food 215437) ==="
R_JEERA=$(curl -s -X POST "$API/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name":215437,
    "preparation_time":20,
    "serves_people":1,
    "ingredients":[
      {"id":18112,"qty":300,"unit":"gm"},
      {"id":18108,"qty":10,"unit":"gm"}
    ]
  }')
echo "$R_JEERA" | python3 -m json.tool 2>/dev/null | head -15

echo ""
echo "=== 3.2: Regular Recipe for Butter Naan (food 215438) ==="
R_NAAN=$(curl -s -X POST "$API/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name":215438,
    "preparation_time":10,
    "serves_people":1,
    "ingredients":[
      {"id":18113,"qty":100,"unit":"gm"},
      {"id":18110,"qty":20,"unit":"ml"}
    ]
  }')
echo "$R_NAAN" | python3 -m json.tool 2>/dev/null | head -15

echo ""
echo "=== 3.3: Manufactured Recipe for Masala Chai (food 215439) → Auto Sub-Recipe ==="
MR_CHAI=$(curl -s -X POST "$API/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name":215439,
    "preparation_time":15,
    "serves_people":1,
    "is_manufactured":true,
    "manufacturing":{"output_qty":1,"output_unit":"batch","consumption_unit":"cup","converion_factor":10},
    "ingredients":[
      {"id":18110,"qty":1000,"unit":"ml"},
      {"id":18108,"qty":5,"unit":"gm"},
      {"id":18109,"qty":3,"unit":"gm"}
    ]
  }')
echo "$MR_CHAI" | python3 -m json.tool 2>/dev/null | head -25

echo ""
echo "=== 3.4: List All Recipes ==="
curl -s "$API/proxy/v2/recipe/get-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
recipes = d.get('recipes', [])
print(f'Total recipes: {len(recipes)}')
for r in recipes:
    print(f'  id={r.get(\"recipe_id\",r.get(\"id\"))}, food={r.get(\"food_name\",r.get(\"name\"))}, manufactured={r.get(\"is_manufactured\")}, mfg_sr={r.get(\"manufactured_sub_recipe_id\")}, fg_inv={r.get(\"fg_inventory_master_id\")}')
"

echo ""
echo "=== 3.5: List Sub-Recipes (auto-created from manufactured) ==="
curl -s "$API/proxy/v2/recipe/sub-recipes" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
srs = d.get('sub_recipes', d.get('data', []))
if not isinstance(srs, list): srs = [srs]
print(f'Total sub-recipes: {len(srs)}')
for s in srs:
    print(f'  id={s.get(\"id\")}, name={s.get(\"name\")}, unit={s.get(\"unit\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 4: VENDOR MANAGEMENT                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== 4.1: Create Vendor: Fresh Farms ==="
V1=$(curl -s -X POST "$API/proxy/v2/inventory/add-vendor" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Fresh Farms","phone":"9200000001","email":"vendor@freshfarms.com","address":"Farm Road, Block A"}')
echo "$V1" | python3 -m json.tool 2>/dev/null | head -15
V1_ID=$(echo "$V1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('id','')))" 2>/dev/null || echo "")
echo "Vendor 1 ID: $V1_ID"

echo ""
echo "=== 4.2: Create Vendor: Spice World ==="
V2=$(curl -s -X POST "$API/proxy/v2/inventory/add-vendor" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Spice World","phone":"9200000002","email":"vendor@spiceworld.com","address":"Spice Market, Zone 3"}')
echo "$V2" | python3 -m json.tool 2>/dev/null | head -15
V2_ID=$(echo "$V2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('id','')))" 2>/dev/null || echo "")
echo "Vendor 2 ID: $V2_ID"

echo ""
echo "=== 4.3: List Vendors ==="
curl -s "$API/proxy/v2/inventory/get-vendor" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
vendors = d if isinstance(d, list) else d.get('data', [])
if not isinstance(vendors, list): vendors = [vendors]
print(f'Total vendors: {len(vendors)}')
for v in vendors:
    print(f'  id={v.get(\"id\")}, name={v.get(\"name\")}, phone={v.get(\"phone\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 5: PURCHASE ORDER (PO) FLOW                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== 5.0: Check operational settings (require_po_for_purchase) ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/operational-settings/get" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
settings = d.get('data',{}).get('settings',d.get('settings',{}))
print('Settings:')
for k,v in (settings.items() if isinstance(settings,dict) else []):
    print(f'  {k}: {v}')
" 2>/dev/null || echo "Settings check done"

echo ""
echo "=== 5.1: Create PO (Purchase Order) ==="
PO1=$(curl -s -X POST "$API/proxy/v2/inventory/purchase-order/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"vendor_id\":$V1_ID,
    \"expected_delivery_date\":\"2026-07-15\",
    \"notes\":\"Initial stock for Heaven Garden\",
    \"items\":[
      {\"inventory_master_id\":18112,\"quantity\":50,\"unit\":\"kg\",\"unit_price\":80},
      {\"inventory_master_id\":18113,\"quantity\":30,\"unit\":\"kg\",\"unit_price\":45},
      {\"inventory_master_id\":18110,\"quantity\":20,\"unit\":\"ltr\",\"unit_price\":60},
      {\"inventory_master_id\":18111,\"quantity\":10,\"unit\":\"kg\",\"unit_price\":350}
    ]
  }")
echo "$PO1" | python3 -m json.tool 2>/dev/null | head -30
PO1_ID=$(echo "$PO1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('data',{}).get('purchase_order',{}).get('id',d.get('id',''))))" 2>/dev/null || echo "")
echo "PO1 ID: $PO1_ID"

echo ""
echo "=== 5.2: Create PO for Spice World ==="
PO2=$(curl -s -X POST "$API/proxy/v2/inventory/purchase-order/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"vendor_id\":$V2_ID,
    \"expected_delivery_date\":\"2026-07-14\",
    \"notes\":\"Spices order\",
    \"items\":[
      {\"inventory_master_id\":18108,\"quantity\":5,\"unit\":\"kg\",\"unit_price\":500},
      {\"inventory_master_id\":18109,\"quantity\":3,\"unit\":\"kg\",\"unit_price\":300}
    ]
  }")
echo "$PO2" | python3 -m json.tool 2>/dev/null | head -30
PO2_ID=$(echo "$PO2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('data',{}).get('purchase_order',{}).get('id',d.get('id',''))))" 2>/dev/null || echo "")
echo "PO2 ID: $PO2_ID"

echo ""
echo "=== 5.3: List POs ==="
curl -s "$API/proxy/v2/inventory/purchase-order/list" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
pos = d.get('data',{}).get('purchase_orders',d.get('data',[]))
if not isinstance(pos, list): pos = [pos]
print(f'Total POs: {len(pos)}')
for p in pos:
    print(f'  id={p.get(\"id\")}, ref={p.get(\"reference_code\")}, vendor={p.get(\"vendor_name\",p.get(\"vendor\",{}).get(\"name\"))}, status={p.get(\"status\")}, items={p.get(\"items_count\",len(p.get(\"items\",[])))}')
"

echo ""
echo "=== 5.4: Approve PO1 ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO1_ID/approve" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Status: {d.get(\"data\",{}).get(\"status\",d.get(\"status\",d.get(\"message\",\"?\")))}'); print(json.dumps(d,indent=2)[:200])" 2>/dev/null

echo ""
echo "=== 5.5: Send PO1 ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO1_ID/send" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Status: {d.get(\"data\",{}).get(\"status\",d.get(\"message\",\"?\"))}')" 2>/dev/null

echo ""
echo "=== 5.6: Receive PO1 (with invoice) ==="
RECEIVE=$(curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO1_ID/receive" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"invoice_number\":\"INV-HG-001\",
    \"purchase_date\":\"10-07-2026\",
    \"payment_type\":\"credit\",
    \"items\":[
      {\"inventory_master_id\":18112,\"received_quantity\":50,\"unit\":\"kg\",\"unit_price\":80,\"batch_number\":\"HG-RICE-001\",\"expiry_date\":\"31-12-2026\"},
      {\"inventory_master_id\":18113,\"received_quantity\":30,\"unit\":\"kg\",\"unit_price\":45,\"batch_number\":\"HG-FLOUR-001\",\"expiry_date\":\"31-12-2026\"},
      {\"inventory_master_id\":18110,\"received_quantity\":20,\"unit\":\"ltr\",\"unit_price\":60,\"batch_number\":\"HG-MILK-001\",\"expiry_date\":\"20-07-2026\"},
      {\"inventory_master_id\":18111,\"received_quantity\":10,\"unit\":\"kg\",\"unit_price\":350,\"batch_number\":\"HG-PANEER-001\",\"expiry_date\":\"20-07-2026\"}
    ]
  }")
echo "$RECEIVE" | python3 -m json.tool 2>/dev/null | head -25

echo ""
echo "=== 5.7: Approve + Send + Receive PO2 ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO2_ID/approve" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' > /dev/null
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO2_ID/send" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' > /dev/null
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO2_ID/receive" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"invoice_number\":\"INV-HG-002\",
    \"purchase_date\":\"10-07-2026\",
    \"payment_type\":\"cash\",
    \"items\":[
      {\"inventory_master_id\":18108,\"received_quantity\":5,\"unit\":\"kg\",\"unit_price\":500,\"batch_number\":\"HG-CUMIN-001\",\"expiry_date\":\"31-12-2026\"},
      {\"inventory_master_id\":18109,\"received_quantity\":3,\"unit\":\"kg\",\"unit_price\":300,\"batch_number\":\"HG-TURM-001\",\"expiry_date\":\"31-12-2026\"}
    ]
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'PO2 Receive: {d.get(\"message\",d.get(\"status\",json.dumps(d)[:200]))}')" 2>/dev/null

echo ""
echo "=== 5.8: Check Stock After PO Receives ==="
curl -s "$API/proxy/v2/inventory/stock-inventory" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
stocks = d.get('data',{}).get('current_stocks',d.get('current_stocks',[]))
if not isinstance(stocks, list): stocks = d.get('data',[]) if isinstance(d.get('data'),list) else [d.get('data',{})]
print(f'Stock items: {len(stocks)}')
for s in stocks:
    print(f'  {s.get(\"stock_title\",s.get(\"title\",\"?\"))}: qty={s.get(\"cal_quantity\",s.get(\"quantity\",\"?\"))} {s.get(\"unit\",\"?\")}, low={s.get(\"is_low_stock\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 5B: NEW PO RECEIVE IMPORT ENDPOINTS                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Test the new endpoints from validation-6-7
echo "=== 5B.1: GET PO receive import template ==="
curl -s -o /dev/null -w "HTTP %{http_code}, Size: %{size_download} bytes" \
  "$API/proxy/v2/inventory/purchase-order/$PO1_ID/receive-import-template" \
  -H "Authorization: Bearer $MASTER_TOKEN"
echo ""

echo ""
echo "=== 5B.2: POST PO parse receive import (no file - validation) ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO1_ID/parse-receive-import" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])" 2>/dev/null

echo ""
echo "=== 5B.3: GET PO import template (general) ==="
curl -s -o /dev/null -w "HTTP %{http_code}, Size: %{size_download} bytes" \
  "$API/proxy/v2/inventory/purchase-order/import-template" \
  -H "Authorization: Bearer $MASTER_TOKEN"
echo ""

echo ""
echo "=== 5B.4: POST check-invoice-number ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/check-invoice-number" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"vendor_id\":$V1_ID,\"invoice_number\":\"INV-HG-001\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])" 2>/dev/null

echo ""
echo "=== 5B.5: POST check-invoice-number (new number) ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/check-invoice-number" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"vendor_id\":$V1_ID,\"invoice_number\":\"INV-HG-999-UNIQUE\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])" 2>/dev/null

echo ""
echo "=== 5B.6: POST parse-import (general PO import - validation) ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/parse-import" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])" 2>/dev/null

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "PHASE 3-5B COMPLETE"
echo "══════════════════════════════════════════════════════════════"
