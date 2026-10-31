#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# Heaven Garden — Phase 2: Catalogue Setup (Categories, Foods, Ingredients, Recipes)
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
echo "║  PHASE 2A: STOCK ITEM CATEGORIES                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== Create Stock Item Category: Spices ==="
CAT1=$(curl -s -X POST "$API/proxy/v2/inventory/stock-item-categories/store" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"category_name":"Spices"}')
echo "$CAT1" | python3 -m json.tool
CAT1_ID=$(echo "$CAT1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Category 1 ID: $CAT1_ID"

echo ""
echo "=== Create Stock Item Category: Dairy ==="
CAT2=$(curl -s -X POST "$API/proxy/v2/inventory/stock-item-categories/store" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"category_name":"Dairy"}')
echo "$CAT2" | python3 -m json.tool
CAT2_ID=$(echo "$CAT2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Category 2 ID: $CAT2_ID"

echo ""
echo "=== Create Stock Item Category: Dry Goods ==="
CAT3=$(curl -s -X POST "$API/proxy/v2/inventory/stock-item-categories/store" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"category_name":"Dry Goods"}')
echo "$CAT3" | python3 -m json.tool
CAT3_ID=$(echo "$CAT3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Category 3 ID: $CAT3_ID"

echo ""
echo "=== List all stock categories ==="
curl -s "$API/proxy/v2/inventory/stock-item-categories" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
cats = d.get('data', d) if isinstance(d.get('data'), list) else d.get('data',{}).get('data',[]) if isinstance(d.get('data',{}).get('data'), list) else [d.get('data',{})]
for c in (cats if isinstance(cats, list) else [cats]):
    if isinstance(c, dict):
        print(f'  id={c.get(\"id\")}, name={c.get(\"category_name\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 2B: INVENTORY ITEMS (RAW MATERIALS)                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== Add Inventory Items ==="
INV_RESP=$(curl -s -X POST "$API/proxy/v2/inventory/add-inventory" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "[
    {\"category_id\":$CAT1_ID,\"stock_title\":\"Cumin Seeds\",\"unit\":\"kg\",\"min_qty_alert\":0.5,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT1_ID,\"stock_title\":\"Turmeric Powder\",\"unit\":\"kg\",\"min_qty_alert\":0.3,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT2_ID,\"stock_title\":\"Milk\",\"unit\":\"ltr\",\"min_qty_alert\":5},
    {\"category_id\":$CAT2_ID,\"stock_title\":\"Paneer\",\"unit\":\"kg\",\"min_qty_alert\":1,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT3_ID,\"stock_title\":\"Rice\",\"unit\":\"kg\",\"min_qty_alert\":10,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT3_ID,\"stock_title\":\"Flour\",\"unit\":\"kg\",\"min_qty_alert\":5,\"consumption_unit\":\"gm\",\"converion_factor\":1000}
  ]")
echo "$INV_RESP" | python3 -m json.tool 2>/dev/null || echo "$INV_RESP"

echo ""
echo "=== List all inventory items ==="
INV_LIST=$(curl -s "$API/proxy/v2/inventory/get-inventory-master" \
  -H "Authorization: Bearer $MASTER_TOKEN")
echo "$INV_LIST" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('data', d) if isinstance(d.get('data'), list) else d.get('data',{}).get('data',[]) if isinstance(d.get('data',{}).get('data'), list) else [d.get('data',{})]
if not isinstance(items, list): items = [items]
print(f'Total inventory items: {len(items)}')
for it in items:
    if isinstance(it, dict):
        print(f'  id={it.get(\"id\")}, title={it.get(\"stock_title\")}, unit={it.get(\"unit\")}, cat={it.get(\"category_id\")}, conv={it.get(\"has_unit_conversion\")}, cons_unit={it.get(\"consumption_unit\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 2C: FOOD CATEGORIES & FOODS                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== Create Food Category: Main Course ==="
FC1=$(curl -s -X POST "$API/proxy/v2/product/add-categories" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Main Course","tax_type":"GST","tax":5}')
echo "$FC1" | python3 -m json.tool 2>/dev/null || echo "$FC1"
FC1_ID=$(echo "$FC1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Food Category 1 ID: $FC1_ID"

echo ""
echo "=== Create Food Category: Breads ==="
FC2=$(curl -s -X POST "$API/proxy/v2/product/add-categories" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Breads","tax_type":"GST","tax":5}')
echo "$FC2" | python3 -m json.tool 2>/dev/null || echo "$FC2"
FC2_ID=$(echo "$FC2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Food Category 2 ID: $FC2_ID"

echo ""
echo "=== Create Food Category: Beverages ==="
FC3=$(curl -s -X POST "$API/proxy/v2/product/add-categories" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Beverages","tax_type":"GST","tax":5}')
echo "$FC3" | python3 -m json.tool 2>/dev/null || echo "$FC3"
FC3_ID=$(echo "$FC3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Food Category 3 ID: $FC3_ID"

echo ""
echo "=== List Food Categories ==="
curl -s "$API/proxy/v2/product/categories" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
cats = d if isinstance(d, list) else d.get('data', [])
if not isinstance(cats, list): cats = [cats]
for c in cats:
    print(f'  id={c.get(\"id\")}, name={c.get(\"name\")}, tax={c.get(\"tax\")}')
"

echo ""
echo "=== Create Food: Paneer Tikka Masala ==="
F1=$(curl -s -X POST "$API/proxy/v2/product/add-food" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Paneer Tikka Masala\",\"price\":250,\"category_id\":$FC1_ID}")
echo "$F1" | python3 -m json.tool 2>/dev/null || echo "$F1"
F1_ID=$(echo "$F1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Food 1 ID: $F1_ID"

echo ""
echo "=== Create Food: Jeera Rice ==="
F2=$(curl -s -X POST "$API/proxy/v2/product/add-food" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Jeera Rice\",\"price\":150,\"category_id\":$FC1_ID}")
echo "$F2" | python3 -m json.tool 2>/dev/null || echo "$F2"
F2_ID=$(echo "$F2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Food 2 ID: $F2_ID"

echo ""
echo "=== Create Food: Butter Naan ==="
F3=$(curl -s -X POST "$API/proxy/v2/product/add-food" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Butter Naan\",\"price\":60,\"category_id\":$FC2_ID}")
echo "$F3" | python3 -m json.tool 2>/dev/null || echo "$F3"
F3_ID=$(echo "$F3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Food 3 ID: $F3_ID"

echo ""
echo "=== Create Food: Masala Chai ==="
F4=$(curl -s -X POST "$API/proxy/v2/product/add-food" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Masala Chai\",\"price\":40,\"category_id\":$FC3_ID}")
echo "$F4" | python3 -m json.tool 2>/dev/null || echo "$F4"
F4_ID=$(echo "$F4" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id', d.get('id','')))" 2>/dev/null || echo "")
echo "Food 4 ID: $F4_ID"

echo ""
echo "=== List Foods ==="
curl -s "$API/proxy/v2/product/foods-list" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
foods = d.get('foods', [])
print(f'Total foods: {len(foods)}')
for f in foods:
    print(f'  id={f.get(\"id\")}, name={f.get(\"name\")}, price={f.get(\"price\")}, cat_id={f.get(\"category\",{}).get(\"id\")}')
"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "PHASE 2 SUMMARY:"
echo "  Stock Categories: $CAT1_ID (Spices), $CAT2_ID (Dairy), $CAT3_ID (Dry Goods)"
echo "  Food Categories: $FC1_ID (Main Course), $FC2_ID (Breads), $FC3_ID (Beverages)"
echo "  Foods: $F1_ID (Paneer Tikka Masala), $F2_ID (Jeera Rice), $F3_ID (Butter Naan), $F4_ID (Masala Chai)"
echo "══════════════════════════════════════════════════════════════"
