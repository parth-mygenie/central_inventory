#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# Hells Kitchen — Phase 2-4: Catalogue + Recipes + Vendors + PO
# ══════════════════════════════════════════════════════════════════
set -uo pipefail
source /tmp/hk_env.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 2: CATALOGUE                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Stock categories
echo "=== Stock Categories ==="
for name in "Proteins" "Grains" "Produce"; do
  curl -s -X POST "$API/proxy/v2/inventory/stock-item-categories/store" \
    -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
    -d "{\"category_name\":\"$name\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  {d.get(\"data\",{}).get(\"category_name\")}: id={d.get(\"data\",{}).get(\"id\")}')" 2>/dev/null
done

# Get category IDs
CATS=$(curl -s "$API/proxy/v2/inventory/stock-item-categories" -H "Authorization: Bearer $MASTER_TOKEN")
echo "$CATS" | python3 -c "
import sys,json; d=json.load(sys.stdin)
cats = d.get('data',[])
for c in cats: print(f'  cat_id={c.get(\"id\")}, name={c.get(\"category_name\")}')
" 2>/dev/null
# Extract first 3 cat IDs
CAT1=$(echo "$CATS" | python3 -c "import sys,json; d=json.load(sys.stdin); cats=d.get('data',[]); print(cats[0]['id'] if len(cats)>0 else '')" 2>/dev/null)
CAT2=$(echo "$CATS" | python3 -c "import sys,json; d=json.load(sys.stdin); cats=d.get('data',[]); print(cats[1]['id'] if len(cats)>1 else '')" 2>/dev/null)
CAT3=$(echo "$CATS" | python3 -c "import sys,json; d=json.load(sys.stdin); cats=d.get('data',[]); print(cats[2]['id'] if len(cats)>2 else '')" 2>/dev/null)

echo ""
echo "=== Inventory Items ==="
curl -s -X POST "$API/proxy/v2/inventory/add-inventory" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "[
    {\"category_id\":$CAT1,\"stock_title\":\"Chicken\",\"unit\":\"kg\",\"min_qty_alert\":2,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT1,\"stock_title\":\"Lamb\",\"unit\":\"kg\",\"min_qty_alert\":1,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT2,\"stock_title\":\"Pasta\",\"unit\":\"kg\",\"min_qty_alert\":3,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT2,\"stock_title\":\"Bread Flour\",\"unit\":\"kg\",\"min_qty_alert\":5,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT3,\"stock_title\":\"Tomatoes\",\"unit\":\"kg\",\"min_qty_alert\":2,\"consumption_unit\":\"gm\",\"converion_factor\":1000},
    {\"category_id\":$CAT3,\"stock_title\":\"Olive Oil\",\"unit\":\"ltr\",\"min_qty_alert\":1,\"consumption_unit\":\"ml\",\"converion_factor\":1000}
  ]" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Message',d.get('message','?')))" 2>/dev/null

# Get inventory IDs
echo ""
INV=$(curl -s "$API/proxy/v2/inventory/get-inventory-master" -H "Authorization: Bearer $MASTER_TOKEN")
echo "$INV" | python3 -c "
import sys,json; d=json.load(sys.stdin)
items = d.get('data',[])
for i in items: print(f'  inv_id={i.get(\"id\")}, title={i.get(\"stock_title\")}, unit={i.get(\"unit\")}, conv={i.get(\"has_unit_conversion\")}')
"

# Extract inv IDs
CHICKEN=$(echo "$INV" | python3 -c "import sys,json; [print(i['id']) for i in json.load(sys.stdin).get('data',[]) if 'Chicken' in i.get('stock_title','')]" 2>/dev/null | head -1)
LAMB=$(echo "$INV" | python3 -c "import sys,json; [print(i['id']) for i in json.load(sys.stdin).get('data',[]) if 'Lamb' in i.get('stock_title','')]" 2>/dev/null | head -1)
PASTA=$(echo "$INV" | python3 -c "import sys,json; [print(i['id']) for i in json.load(sys.stdin).get('data',[]) if 'Pasta' in i.get('stock_title','')]" 2>/dev/null | head -1)
FLOUR=$(echo "$INV" | python3 -c "import sys,json; [print(i['id']) for i in json.load(sys.stdin).get('data',[]) if 'Bread Flour' in i.get('stock_title','')]" 2>/dev/null | head -1)
TOMATO=$(echo "$INV" | python3 -c "import sys,json; [print(i['id']) for i in json.load(sys.stdin).get('data',[]) if 'Tomato' in i.get('stock_title','')]" 2>/dev/null | head -1)
OLIVE=$(echo "$INV" | python3 -c "import sys,json; [print(i['id']) for i in json.load(sys.stdin).get('data',[]) if 'Olive' in i.get('stock_title','')]" 2>/dev/null | head -1)

echo ""
echo "IDs: Chicken=$CHICKEN, Lamb=$LAMB, Pasta=$PASTA, Flour=$FLOUR, Tomato=$TOMATO, Olive=$OLIVE"

# Food categories
echo ""
echo "=== Food Categories ==="
FC1=$(curl -s -X POST "$API/proxy/v2/product/add-categories" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"name":"Mains","tax_type":"GST","tax":5}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('category_id',''))" 2>/dev/null)
FC2=$(curl -s -X POST "$API/proxy/v2/product/add-categories" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"name":"Sides","tax_type":"GST","tax":5}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('category_id',''))" 2>/dev/null)
echo "Food cats: Mains=$FC1, Sides=$FC2"

# Foods
echo ""
echo "=== Foods ==="
F1=$(curl -s -X POST "$API/proxy/v2/product/add-food" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Grilled Chicken\",\"price\":350,\"category_id\":$FC1}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('id','')))" 2>/dev/null)
F2=$(curl -s -X POST "$API/proxy/v2/product/add-food" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Lamb Ragu Pasta\",\"price\":450,\"category_id\":$FC1}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('id','')))" 2>/dev/null)
F3=$(curl -s -X POST "$API/proxy/v2/product/add-food" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Garlic Bread\",\"price\":120,\"category_id\":$FC2}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('id','')))" 2>/dev/null)
F4=$(curl -s -X POST "$API/proxy/v2/product/add-food" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Marinara Sauce Cup\",\"price\":80,\"category_id\":$FC2}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',d.get('id','')))" 2>/dev/null)
echo "Foods: GrilledChicken=$F1, LambRagu=$F2, GarlicBread=$F3, MarinaraCup=$F4"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 3: RECIPES (Regular + Sub + Manufactured)             ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Sub-recipe with correct `subunit` field
echo "=== Sub-Recipe: Marinara Base (standalone) ==="
SR1=$(curl -s -X POST "$API/proxy/v2/recipe/store-sub-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"sub_recipe_name\":\"Marinara Base\",\"prepration_time\":20,\"serve_people\":4,\"subunit\":\"portion\",\"qty\":1,\"ingredients\":[{\"id\":$TOMATO,\"qty\":500,\"unit\":\"gm\"},{\"id\":$OLIVE,\"qty\":50,\"unit\":\"ml\"}]}")
echo "$SR1" | python3 -c "import sys,json; d=json.load(sys.stdin); sr=d.get('sub_recipe',d.get('data',{})); print(f'Sub-Recipe: id={sr.get(\"id\",\"?\")}, name={sr.get(\"name\",\"?\")}'); print(f'Full resp keys: {list(d.keys())}')" 2>/dev/null
SR1_ID=$(echo "$SR1" | python3 -c "import sys,json; d=json.load(sys.stdin); sr=d.get('sub_recipe',d.get('data',{})); print(sr.get('id',''))" 2>/dev/null)
echo "SR1_ID: $SR1_ID"

echo ""
echo "=== Regular Recipe: Grilled Chicken (food $F1) ==="
curl -s -X POST "$API/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":$F1,\"preparation_time\":25,\"serves_people\":1,\"ingredients\":[{\"id\":$CHICKEN,\"qty\":300,\"unit\":\"gm\"},{\"id\":$OLIVE,\"qty\":20,\"unit\":\"ml\"}]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Recipe: id={d.get(\"recipe_id\")}, name={d.get(\"name\")}')" 2>/dev/null

echo ""
echo "=== Regular Recipe: Lamb Ragu (food $F2) ==="
curl -s -X POST "$API/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":$F2,\"preparation_time\":45,\"serves_people\":1,\"ingredients\":[{\"id\":$LAMB,\"qty\":200,\"unit\":\"gm\"},{\"id\":$PASTA,\"qty\":200,\"unit\":\"gm\"},{\"id\":$TOMATO,\"qty\":100,\"unit\":\"gm\"}]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Recipe: id={d.get(\"recipe_id\")}, name={d.get(\"name\")}')" 2>/dev/null

echo ""
echo "=== Regular Recipe: Garlic Bread (food $F3) ==="
curl -s -X POST "$API/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":$F3,\"preparation_time\":10,\"serves_people\":1,\"ingredients\":[{\"id\":$FLOUR,\"qty\":100,\"unit\":\"gm\"},{\"id\":$OLIVE,\"qty\":15,\"unit\":\"ml\"}]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Recipe: id={d.get(\"recipe_id\")}, name={d.get(\"name\")}')" 2>/dev/null

echo ""
echo "=== Manufactured Recipe: Marinara Sauce Cup (food $F4) → auto sub-recipe + FG ==="
MR=$(curl -s -X POST "$API/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":$F4,\"preparation_time\":20,\"serves_people\":1,\"is_manufactured\":true,\"manufacturing\":{\"output_qty\":1,\"output_unit\":\"batch\",\"consumption_unit\":\"cup\",\"converion_factor\":8},\"ingredients\":[{\"id\":$TOMATO,\"qty\":2000,\"unit\":\"gm\"},{\"id\":$OLIVE,\"qty\":200,\"unit\":\"ml\"}]}")
echo "$MR" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Recipe: id={d.get(\"recipe_id\")}, manufactured={d.get(\"is_manufactured\")}')
print(f'  sub_recipe_id={d.get(\"manufactured_sub_recipe_id\")}')
print(f'  fg_inv_id={d.get(\"fg_inventory_master_id\")}')
" 2>/dev/null
MR_SR=$(echo "$MR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('manufactured_sub_recipe_id',''))" 2>/dev/null)

echo ""
echo "=== List Recipes ==="
curl -s "$API/proxy/v2/recipe/get-recipe" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
for r in d.get('recipes',[]):
    print(f'  id={r.get(\"recipe_id\")}, food={r.get(\"food_name\")}, mfg={r.get(\"is_manufactured\")}')
"

echo ""
echo "=== List Sub-Recipes ==="
curl -s "$API/proxy/v2/recipe/sub-recipes" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
for s in d.get('sub_recipes',[]):
    print(f'  id={s.get(\"id\")}, name={s.get(\"name\")}, unit={s.get(\"unit\")}')
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 4: VENDORS + PO (with correct batch field)           ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo "=== Create Vendors ==="
V1=$(curl -s -X POST "$API/proxy/v2/inventory/add-vendor" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"vendor_name":"Metro Wholesale"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
V2=$(curl -s -X POST "$API/proxy/v2/inventory/add-vendor" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{"vendor_name":"Farm Direct"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
echo "Vendors: Metro=$V1, Farm=$V2"

echo ""
echo "=== Create PO ==="
PO=$(curl -s -X POST "$API/proxy/v2/inventory/purchase-order/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"vendor_id\":$V1,\"expected_delivery_date\":\"2026-07-20\",\"notes\":\"Opening stock\",\"lines\":[
    {\"inventory_master_id\":$CHICKEN,\"ordered_qty\":20,\"ordered_unit\":\"kg\",\"expected_rate\":250},
    {\"inventory_master_id\":$LAMB,\"ordered_qty\":10,\"ordered_unit\":\"kg\",\"expected_rate\":600},
    {\"inventory_master_id\":$PASTA,\"ordered_qty\":15,\"ordered_unit\":\"kg\",\"expected_rate\":120},
    {\"inventory_master_id\":$FLOUR,\"ordered_qty\":25,\"ordered_unit\":\"kg\",\"expected_rate\":45},
    {\"inventory_master_id\":$TOMATO,\"ordered_qty\":30,\"ordered_unit\":\"kg\",\"expected_rate\":40},
    {\"inventory_master_id\":$OLIVE,\"ordered_qty\":10,\"ordered_unit\":\"ltr\",\"expected_rate\":500}
  ]}")
PO_ID=$(echo "$PO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
PO_REF=$(echo "$PO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('reference_code',''))" 2>/dev/null)
echo "PO: id=$PO_ID, ref=$PO_REF"

echo "=== Approve + Send ==="
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO_ID/approve" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null
curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO_ID/send" -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" -d '{}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null

# Get line IDs for receive
echo "=== Get PO lines ==="
LINES=$(curl -s "$API/proxy/v2/inventory/purchase-order/$PO_ID" -H "Authorization: Bearer $MASTER_TOKEN")
echo "$LINES" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
for l in d.get('lines',[]): print(f'  line={l.get(\"id\")}, inv={l.get(\"inventory_master_id\")}, title={l.get(\"stock_title\")}, qty={l.get(\"ordered_qty\")}')
"
# Extract line IDs
LINE_IDS=$(echo "$LINES" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
for l in d.get('lines',[]): print(l.get('id'))
")
L1=$(echo "$LINE_IDS" | sed -n '1p'); L2=$(echo "$LINE_IDS" | sed -n '2p'); L3=$(echo "$LINE_IDS" | sed -n '3p')
L4=$(echo "$LINE_IDS" | sed -n '4p'); L5=$(echo "$LINE_IDS" | sed -n '5p'); L6=$(echo "$LINE_IDS" | sed -n '6p')

echo ""
echo "=== Receive PO (with batch + expiry_date) ==="
RECV=$(curl -s -X POST "$API/proxy/v2/inventory/purchase-order/$PO_ID/receive" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"invoice_number\":\"INV-HK-001\",\"purchase_date\":\"10-07-2026\",\"payment_type\":\"credit\",\"receive_lines\":[
    {\"line_id\":$L1,\"received_qty\":20,\"actual_rate\":250,\"batch\":\"HK-CHKN-001\",\"expiry_date\":\"2026-12-31\"},
    {\"line_id\":$L2,\"received_qty\":10,\"actual_rate\":600,\"batch\":\"HK-LAMB-001\",\"expiry_date\":\"2026-12-31\"},
    {\"line_id\":$L3,\"received_qty\":15,\"actual_rate\":120,\"batch\":\"HK-PAST-001\",\"expiry_date\":\"2027-06-30\"},
    {\"line_id\":$L4,\"received_qty\":25,\"actual_rate\":45,\"batch\":\"HK-FLOR-001\",\"expiry_date\":\"2027-06-30\"},
    {\"line_id\":$L5,\"received_qty\":30,\"actual_rate\":40,\"batch\":\"HK-TOMA-001\",\"expiry_date\":\"2026-08-15\"},
    {\"line_id\":$L6,\"received_qty\":10,\"actual_rate\":500,\"batch\":\"HK-OLIV-001\",\"expiry_date\":\"2027-12-31\"}
  ]}")
echo "$RECV" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Receive: {d.get(\"message\",\"?\")} status={d.get(\"data\",{}).get(\"status\",\"?\")}')" 2>/dev/null

echo ""
echo "=== Verify segments have batch ==="
curl -s -X POST "$API/proxy/v2/inventory-transfer/source-options" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"source_inventory_master_id\":$CHICKEN,\"from_restaurant_id\":803}" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('data',{})
for s in d.get('segments',[]): print(f'  seg={s.get(\"segment_id\")}, batch={s.get(\"batch\")}, exp={s.get(\"expiry_date\")}, qty={s.get(\"display_qty\")}')
for k,v in d.get('filters',{}).items(): print(f'  {k}: qty={v.get(\"display_qty\")}, count={v.get(\"count\")}')
"

echo ""
echo "=== Stock after PO ==="
curl -s "$API/proxy/v2/inventory/stock-inventory" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
for s in d.get('data',{}).get('current_stocks',[]): print(f'  {s.get(\"stock_title\")}: {s.get(\"cal_quantity\")} {s.get(\"unit\")}')
"

# Save IDs
cat >> /tmp/hk_env.sh << ENVEOF2
export CHICKEN=$CHICKEN
export LAMB=$LAMB
export PASTA=$PASTA
export FLOUR=$FLOUR
export TOMATO=$TOMATO
export OLIVE=$OLIVE
export V1=$V1
export V2=$V2
export PO_ID=$PO_ID
export MR_SR=$MR_SR
export F1=$F1
export F2=$F2
export F3=$F3
export F4=$F4
export SR1_ID=$SR1_ID
ENVEOF2
echo ""
echo "Phase 2-4 complete. IDs saved."
