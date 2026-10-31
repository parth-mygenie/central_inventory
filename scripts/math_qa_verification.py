#!/usr/bin/env python3
"""
CENTRAL INVENTORY MATH DISCOVERY & RECONCILIATION QA
Verifies all calculation areas against real preprod data (Chai 813).
READ-ONLY — does not create/modify any data.
"""

import requests, json, sys, os, time
from datetime import datetime

with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]

def login(email):
    r = requests.post(f"{API_URL}/api/proxy/auth/login",
        json={"email": email, "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
    d = r.json()
    return d.get("token", ""), d.get("restaurant_id"), d.get("restaurant_type_flag")

def api(token, method, path, data=None):
    H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if method == "GET":
        r = requests.get(f"{API_URL}/api/proxy/v2/{path}", headers=H, timeout=25)
    else:
        r = requests.post(f"{API_URL}/api/proxy/v2/{path}", headers=H, json=data or {}, timeout=25)
    return r.json()

results = []
def record(area, test_id, description, expected, actual, status, notes=""):
    results.append({
        "area": area, "test_id": test_id, "description": description,
        "expected": expected, "actual": actual, "status": status, "notes": notes
    })

# ========== LOGIN ==========
token_813, rid_813, type_813 = login("owner@chai.com")
token_814, rid_814, type_814 = login("manager@chaimasternorth.com")
token_816, rid_816, type_816 = login("manager@chaioutletn1.com")

print(f"Logged in: Central={rid_813}({type_813}), MasterN={rid_814}({type_814}), OutletN1={rid_816}({type_816})")

# ========== 1. STOCK INVENTORY CALCULATIONS ==========
print("\n=== 1. STOCK INVENTORY ===")

stock_data = api(token_813, "GET", "inventory/stock-inventory")
stocks = stock_data.get("current_stocks", [])
stock_map = {s["id"]: s for s in stocks}

# Test 1.1: cal_quantity is a number (display_qty is STRING from POS)
for s in stocks[:5]:
    cal_q = s.get("cal_quantity")
    disp_q = s.get("display_qty")
    is_numeric = isinstance(cal_q, (int, float)) or (isinstance(cal_q, str) and cal_q.replace('.','',1).replace('-','',1).isdigit())
    record("STOCK", "1.1", f"cal_quantity is numeric for {s['stock_title']}", "numeric", type(cal_q).__name__, "PASS" if is_numeric else "FAIL")

# Test 1.2: Total items count
total_items = len(stocks)
record("STOCK", "1.2", "Total stock items count (813)", ">=42 raw + 19 FG = 61+", str(total_items), "PASS" if total_items >= 61 else "FAIL")

# Test 1.3: Items with stock > 0
items_with_stock = len([s for s in stocks if float(s.get("cal_quantity", 0)) > 0])
record("STOCK", "1.3", "Items with positive stock", ">=40 (42 raw - consumed + FG produced)", str(items_with_stock), "PASS" if items_with_stock >= 40 else "FAIL")

print(f"  1.1-1.3: Stock basics verified ({total_items} items, {items_with_stock} with stock)")

# ========== 2. PO CALCULATIONS ==========
print("\n=== 2. PURCHASE ORDER MATH ===")

po_list = api(token_813, "GET", "inventory/purchase-order/list")
pos = po_list.get("data", [])

for po in pos:
    po_id = po["id"]
    po_detail = api(token_813, "GET", f"inventory/purchase-order/{po_id}")
    po_data = po_detail.get("data", po_detail)
    lines = po_data.get("lines", [])
    
    # Test 2.1: Line total = ordered_qty * expected_rate
    for l in lines:
        oq = float(l.get("ordered_qty", 0))
        er = float(l.get("expected_rate", 0))
        expected_total = oq * er
        actual_total = float(l.get("expected_line_total", 0))
        diff = abs(expected_total - actual_total)
        record("PO", f"2.1-PO{po_id}-L{l['line_no']}", 
               f"PO#{po_id} Line {l['line_no']} ({l['stock_title']}): ordered_qty*rate = line_total",
               f"{expected_total:.2f}", f"{actual_total:.2f}",
               "PASS" if diff < 0.01 else "FAIL",
               f"diff={diff:.2f}")
    
    # Test 2.2: Received qty == Ordered qty (for fully received POs)
    if po_data.get("status") in ("received", "closed"):
        for l in lines:
            oq = float(l.get("ordered_qty", 0))
            rq = float(l.get("received_qty", 0))
            record("PO", f"2.2-PO{po_id}-L{l['line_no']}", 
                   f"PO#{po_id} L{l['line_no']}: received_qty == ordered_qty (full receive)",
                   str(oq), str(rq), "PASS" if abs(oq - rq) < 0.01 else "FAIL")
    
    time.sleep(0.3)

print(f"  2.1-2.2: PO math verified ({len(pos)} POs)")

# ========== 3. PRODUCTION RUN CALCULATIONS ==========
print("\n=== 3. PRODUCTION RUN MATH ===")

prod_data = api(token_813, "GET", "inventory/production-run?limit=50")
runs = prod_data.get("data", [])
if isinstance(runs, dict): runs = runs.get("data", [])

for run in runs[:10]:  # Check first 10
    run_id = run.get("id", run.get("production_run_id"))
    run_detail = api(token_813, "GET", f"inventory/production-run/{run_id}")
    rd = run_detail.get("data", run_detail)
    
    allocs = rd.get("consumed_allocations", rd.get("allocations", []))
    total_cost = float(rd.get("total_cost", 0))
    unit_cost = float(rd.get("unit_cost", 0))
    output_qty = float(rd.get("quantity_added", rd.get("actual_output_qty", 0)) or 0)
    
    # Test 3.1: total_cost == sum(ingredient line costs)
    sum_ingredient_costs = sum(float(a.get("line_cost", a.get("allocation_line_cost", 0))) for a in allocs)
    diff = abs(total_cost - sum_ingredient_costs)
    record("PRODUCTION", f"3.1-RUN{run_id}",
           f"Run #{run_id}: total_cost == sum(ingredient costs)",
           f"{sum_ingredient_costs:.4f}", f"{total_cost:.4f}",
           "PASS" if diff < 0.01 else "FAIL", f"diff={diff:.4f}")
    
    # Test 3.2: unit_cost == total_cost / output_qty (if output_qty > 0)
    if output_qty > 0:
        expected_unit = total_cost / output_qty
        diff_unit = abs(unit_cost - expected_unit)
        record("PRODUCTION", f"3.2-RUN{run_id}",
               f"Run #{run_id}: unit_cost == total_cost / output_qty",
               f"{expected_unit:.6f}", f"{unit_cost:.6f}",
               "PASS" if diff_unit < 0.01 else "FAIL", f"diff={diff_unit:.6f}")
    
    time.sleep(0.3)

print(f"  3.1-3.2: Production math verified ({len(runs)} runs)")

# ========== 4. TRANSFER CALCULATIONS ==========
print("\n=== 4. TRANSFER MATH ===")

transfer_data = api(token_813, "POST", "inventory-transfer/history", {"limit": 20})
transfers = transfer_data.get("data", [])

for t in transfers:
    tid = t["id"]
    td = api(token_813, "GET", f"inventory-transfer/details/{tid}")
    tdata = td.get("data", td)
    lines = tdata.get("lines", tdata.get("items", []))
    
    # Test 4.1: dispatched_qty matches requested_qty for direct dispatches
    for l in lines:
        req_qty = float(l.get("requested_qty", 0))
        disp_qty = float(l.get("dispatched_qty", l.get("dispatched_display_qty", 0)))
        if req_qty > 0 and disp_qty > 0:
            record("TRANSFER", f"4.1-TRF{tid}-L{l.get('id','')}",
                   f"TRF#{tid}: dispatched == requested",
                   str(req_qty), str(disp_qty),
                   "PASS" if abs(req_qty - disp_qty) < 0.01 else "FAIL")
    time.sleep(0.3)

print(f"  4.1: Transfer math verified ({len(transfers)} transfers)")

# ========== 5. SUB-RECIPE BOM COST ==========
print("\n=== 5. SUB-RECIPE BOM COST ===")

sr_data = api(token_813, "GET", "recipe/sub-recipes")
sub_recipes = sr_data.get("sub_recipes", [])

for sr in sub_recipes[:10]:
    sr_id = sr["recipe_id"]
    inv_id = sr.get("inventory_id")
    ings = sr.get("ingredients", [])
    
    # Test 5.1: BOM cost = sum(ingredient_qty * unit_cost from stock segments)
    bom_cost = 0
    for ing in ings:
        ing_id = ing.get("ingredient_id")
        ing_qty = float(ing.get("ingredient_qty", 0))
        stock = stock_map.get(ing_id)
        if stock:
            segs = stock.get("segments_preview", [])
            uc = float(segs[0].get("unit_cost", 0)) if segs else 0
            bom_cost += ing_qty * uc
    
    # This is the frontend's materialCost calculation
    record("BOM_COST", f"5.1-SR{sr_id}",
           f"Sub-recipe '{sr['name']}': BOM cost from stock segments",
           f"computed={bom_cost:.4f}", f"segment_data_available={'yes' if any(stock_map.get(i.get('ingredient_id'),{}).get('segments_preview') for i in ings) else 'no'}",
           "INFO", "BOM cost depends on segment unit_cost availability in basic stock call")

print(f"  5.1: BOM cost checked ({len(sub_recipes)} sub-recipes)")

# ========== 6. VENDOR INTELLIGENCE ==========
print("\n=== 6. VENDOR INTELLIGENCE ===")

vendor_items = api(token_813, "GET", "inventory/vendor-item-list")
vi_data = vendor_items.get("data", vendor_items)
if isinstance(vi_data, list):
    records_list = vi_data
else:
    records_list = vi_data.get("data", [])

# Test 6.1: Average rate = totalAmount / totalQty per vendor per item
vendor_item_groups = {}
for r in records_list:
    key = (r.get("vendor_id"), r.get("inventory_master_id"))
    if key not in vendor_item_groups:
        vendor_item_groups[key] = {"total_amt": 0, "total_qty": 0, "name": r.get("Vendor_Name",""), "item": r.get("stock_title","")}
    vendor_item_groups[key]["total_amt"] += float(r.get("Amount", 0))
    vendor_item_groups[key]["total_qty"] += float(r.get("stock_quantity_raw", 0))

for (vid, iid), grp in list(vendor_item_groups.items())[:10]:
    if grp["total_qty"] > 0:
        expected_avg = grp["total_amt"] / grp["total_qty"]
        record("VENDOR_INTEL", f"6.1-V{vid}-I{iid}",
               f"Avg rate for {grp['name']}/{grp['item']}: totalAmt/totalQty",
               f"{expected_avg:.2f}", f"(frontend computes this client-side)",
               "INFO", f"amt={grp['total_amt']:.2f}, qty={grp['total_qty']:.2f}")

print(f"  6.1: Vendor intelligence checked ({len(records_list)} purchase records)")

# ========== 7. CONSUMPTION REPORT ==========
print("\n=== 7. CONSUMPTION REPORT ===")

consumption = api(token_813, "POST", "inventory/daily-consumption-report", {"date": datetime.now().strftime("%Y-%m-%d")})
cons_data = consumption.get("data", consumption)
if isinstance(cons_data, dict):
    summary = cons_data.get("summary", cons_data.get("ingredients", []))
    by_rest = cons_data.get("by_restaurant", [])
else:
    summary = cons_data if isinstance(cons_data, list) else []
    by_rest = []

record("CONSUMPTION", "7.1", 
       f"Consumption report returns data",
       "list of ingredients", f"{len(summary)} items",
       "PASS" if len(summary) > 0 else "INFO", 
       "May be empty if no consumption today")

print(f"  7.1: Consumption report ({len(summary)} items)")

# ========== 8. STOCK DETAIL (SEGMENTS) ==========
print("\n=== 8. STOCK DETAIL / FEFO ===")

# Check a raw material with known stock
test_item_id = 17772  # Whole Wheat Flour
stock_detail = api(token_813, "GET", f"inventory/stock-detail/{test_item_id}")
sd = stock_detail.get("data", stock_detail)
segments = sd.get("segments", sd.get("stock_segments", []))

if segments:
    # Test 8.1: Sum of segment quantities = total stock
    seg_total = sum(float(s.get("cal_quantity", s.get("display_qty", 0))) for s in segments)
    total_stock = float(stock_map.get(test_item_id, {}).get("cal_quantity", 0))
    diff = abs(seg_total - total_stock)
    record("STOCK_DETAIL", "8.1",
           f"Whole Wheat Flour: sum(segment qty) == total stock",
           f"{total_stock:.2f}", f"seg_sum={seg_total:.2f}",
           "PASS" if diff < 1 else "FAIL", f"diff={diff:.2f}")
    
    # Test 8.2: FEFO ordering (earliest expiry first)
    expiry_dates = [s.get("expiry_date") for s in segments if s.get("expiry_date")]
    if len(expiry_dates) >= 2:
        is_fefo = all(expiry_dates[i] <= expiry_dates[i+1] for i in range(len(expiry_dates)-1))
        record("STOCK_DETAIL", "8.2",
               "Segments ordered by FEFO (earliest expiry first)",
               "ascending expiry", str(expiry_dates[:3]),
               "PASS" if is_fefo else "FAIL")

print(f"  8.1-8.2: Stock detail/FEFO verified")

# ========== 9. MASTER STORE STOCK (after receiving transfers) ==========
print("\n=== 9. MASTER/OUTLET STOCK ===")

master_stock = api(token_814, "GET", "inventory/stock-inventory")
m_stocks = master_stock.get("current_stocks", [])
m_with_stock = [s for s in m_stocks if float(s.get("cal_quantity", 0)) > 0]

record("HIERARCHY_STOCK", "9.1",
       "Master North (814) has FG stock after receiving transfers",
       ">0 items with stock", f"{len(m_with_stock)} items",
       "PASS" if len(m_with_stock) > 0 else "FAIL")

outlet_stock = api(token_816, "GET", "inventory/stock-inventory")
o_stocks = outlet_stock.get("current_stocks", [])
o_with_stock = [s for s in o_stocks if float(s.get("cal_quantity", 0)) > 0]

record("HIERARCHY_STOCK", "9.2",
       "Outlet N1 (816) has FG stock after receiving transfers",
       ">0 items with stock", f"{len(o_with_stock)} items",
       "PASS" if len(o_with_stock) > 0 else "FAIL")

print(f"  9.1-9.2: Hierarchy stock ({len(m_with_stock)} master, {len(o_with_stock)} outlet items)")

# ========== 10. PO KPI CALCULATIONS ==========
print("\n=== 10. PO LIST KPIs ===")

# Test 10.1: Total POs count
record("PO_KPI", "10.1",
       "Total POs count", "6", str(len(pos)),
       "PASS" if len(pos) == 6 else "FAIL")

# Test 10.2: All POs should be closed (auto-close on full receive)
closed = [p for p in pos if p.get("status") == "closed"]
record("PO_KPI", "10.2",
       "All POs are closed (auto-close on full receive)", "6", str(len(closed)),
       "PASS" if len(closed) == 6 else "FAIL")

print(f"  10.1-10.2: PO KPIs verified")

# ========== 11. PRODUCTION KPIs ==========
print("\n=== 11. PRODUCTION KPIs ===")

# Test 11.1: Total runs
record("PROD_KPI", "11.1",
       "Total production runs", ">=19", str(len(runs)),
       "PASS" if len(runs) >= 19 else "FAIL")

# Test 11.2: Total FG produced = sum of all output quantities
total_fg = sum(float(r.get("actual_output_qty", r.get("planned_output_qty", r.get("quantity_added", 0))) or 0) for r in runs)
record("PROD_KPI", "11.2",
       "Total FG produced (sum of outputs)", ">0", f"{total_fg:.0f}",
       "PASS" if total_fg > 0 else "FAIL")

# Test 11.3: Total material cost = sum of all run costs
total_mat_cost = sum(float(r.get("total_cost", 0)) for r in runs)
record("PROD_KPI", "11.3",
       "Total material cost (sum of run costs)", ">0", f"₹{total_mat_cost:.2f}",
       "PASS" if total_mat_cost > 0 else "FAIL")

print(f"  11.1-11.3: Production KPIs verified")

# ========== SAVE RESULTS ==========
print(f"\n{'='*60}")
print(f"TOTAL TESTS: {len(results)}")
passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
info = sum(1 for r in results if r["status"] == "INFO")
print(f"PASSED: {passed}")
print(f"FAILED: {failed}")
print(f"INFO: {info}")

with open("/tmp/math_qa_results.json", "w") as f:
    json.dump(results, f, indent=2, default=str)

print(f"\nResults saved to /tmp/math_qa_results.json")

# Print failures
if failed > 0:
    print(f"\n{'='*60}")
    print("FAILURES:")
    for r in results:
        if r["status"] == "FAIL":
            print(f"  [{r['area']}] {r['test_id']}: {r['description']}")
            print(f"    Expected: {r['expected']}")
            print(f"    Actual:   {r['actual']}")
            print(f"    Notes:    {r['notes']}")
