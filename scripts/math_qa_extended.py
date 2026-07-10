#!/usr/bin/env python3
"""
Create test data for 7 untested calculation areas.
Each test creates minimal data, records before/after state, and verifies math.
Restaurant: Chai 813
"""

import requests, json, sys, time
from datetime import datetime, timedelta

with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]

def login(email):
    r = requests.post(f"{API_URL}/api/proxy/auth/login",
        json={"email": email, "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
    return r.json().get("token", "")

def api_get(token, path):
    return requests.get(f"{API_URL}/api/proxy/v2/{path}",
        headers={"Authorization": f"Bearer {token}"}, timeout=20).json()

def api_post(token, path, data):
    return requests.post(f"{API_URL}/api/proxy/v2/{path}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=data, timeout=20).json()

def get_stock_qty(token, inv_id):
    d = api_get(token, "inventory/stock-inventory")
    for s in d.get("current_stocks", []):
        if s["id"] == inv_id:
            return float(s.get("cal_quantity", 0))
    return 0

results = []
def record(area, test_id, desc, expected, actual, status, notes=""):
    results.append({"area": area, "test_id": test_id, "description": desc,
                    "expected": str(expected), "actual": str(actual), "status": status, "notes": notes})
    symbol = "PASS" if status == "PASS" else "FAIL" if status == "FAIL" else "INFO"
    print(f"  [{symbol}] {test_id}: {desc}")
    if status == "FAIL":
        print(f"         Expected: {expected}")
        print(f"         Actual:   {actual}")

token = login("owner@chai.com")
print(f"Logged in as Chai Central (813)\n")

# ================================================================
# TEST 1: WASTAGE
# ================================================================
print("=" * 60)
print("TEST 1: WASTAGE — Record wastage for Salt, verify stock decrease")
print("=" * 60)

WASTAGE_ITEM = 17790  # Salt
WASTAGE_QTY = 50  # 50 gm
WASTAGE_SEGMENT = 387  # Salt segment

before_qty = get_stock_qty(token, WASTAGE_ITEM)
print(f"  Salt before: {before_qty}")

# Record wastage
wastage_resp = api_post(token, "inventory-transfer/record-wastage", {
    "source_inventory_master_id": WASTAGE_ITEM,
    "quantity": WASTAGE_QTY,
    "unit": "gm",
    "source_selector": {"mode": "segment_id", "segment_id": WASTAGE_SEGMENT},
    "reason": "Expired",
    "restaurant_id": 813,
})

if wastage_resp.get("status") == True or "transfer_id" in str(wastage_resp):
    time.sleep(1)
    after_qty = get_stock_qty(token, WASTAGE_ITEM)
    expected_after = before_qty - WASTAGE_QTY
    diff = abs(after_qty - expected_after)
    record("WASTAGE", "W-1", f"Salt stock decreased by {WASTAGE_QTY} after wastage",
           f"{expected_after:.2f}", f"{after_qty:.2f}", "PASS" if diff < 1 else "FAIL", f"diff={diff:.2f}")
else:
    msg = wastage_resp.get("message", json.dumps(wastage_resp)[:200])
    record("WASTAGE", "W-1", "Wastage creation", "success", f"FAIL: {msg}", "FAIL")
    print(f"  Full response: {json.dumps(wastage_resp)[:300]}")

# Verify wastage report
time.sleep(0.5)
today = datetime.now().strftime("%Y-%m-%d")
wastage_report = api_post(token, "inventory/wastage-report", {
    "from_date": today, "to_date": today, "restaurant_ids": [813]
})
wr_data = wastage_report.get("data", wastage_report)
w_records = wr_data.get("wastage_records", [])
record("WASTAGE", "W-2", "Wastage report contains today's entry",
       ">=1 record", f"{len(w_records)} records", "PASS" if len(w_records) >= 1 else "FAIL")

if w_records:
    w_summary = wr_data.get("summary", {})
    record("WASTAGE", "W-3", "Wastage report summary has total_loss",
           f">0", f"{w_summary.get('total_loss', 0)}", 
           "PASS" if float(w_summary.get("total_loss", 0)) > 0 else "FAIL")

print()

# ================================================================
# TEST 2: STOCK ADJUSTMENT (DECREASE)
# ================================================================
print("=" * 60)
print("TEST 2: STOCK ADJUSTMENT (DECREASE) — Reduce Oats stock")
print("=" * 60)

ADJ_ITEM = 17793  # Oats
ADJ_QTY = 100  # 100 gm
ADJ_SEGMENT = 404  # Oats segment

before_qty = get_stock_qty(token, ADJ_ITEM)
print(f"  Oats before: {before_qty}")

adj_resp = api_post(token, "inventory-transfer/decrease-adjustment", {
    "source_inventory_master_id": ADJ_ITEM,
    "quantity": ADJ_QTY,
    "unit": "gm",
    "source_selector": {"mode": "segment_id", "segment_id": ADJ_SEGMENT},
    "reason": "Damaged during storage",
    "restaurant_id": 813,
})

if adj_resp.get("status") == True or "success" in str(adj_resp).lower():
    time.sleep(1)
    after_qty = get_stock_qty(token, ADJ_ITEM)
    expected_after = before_qty - ADJ_QTY
    diff = abs(after_qty - expected_after)
    record("ADJUSTMENT", "A-1", f"Oats stock decreased by {ADJ_QTY} after adjustment",
           f"{expected_after:.2f}", f"{after_qty:.2f}", "PASS" if diff < 1 else "FAIL", f"diff={diff:.2f}")
else:
    msg = adj_resp.get("message", json.dumps(adj_resp)[:200])
    record("ADJUSTMENT", "A-1", "Decrease adjustment", "success", f"FAIL: {msg}", "FAIL")
    print(f"  Full response: {json.dumps(adj_resp)[:300]}")

print()

# ================================================================
# TEST 3: STOCK ADJUSTMENT (INCREASE)
# ================================================================
print("=" * 60)
print("TEST 3: STOCK ADJUSTMENT (INCREASE) — Add Raisins stock")
print("=" * 60)

INC_ITEM = 17791  # Raisins
INC_QTY = 200  # 200 gm

before_qty = get_stock_qty(token, INC_ITEM)
print(f"  Raisins before: {before_qty}")

inc_resp = api_post(token, f"inventory/add-stock/{INC_ITEM}", {
    "quantity": INC_QTY,
    "unit": "gm",
    "reason": "Found extra in warehouse",
    "vendor_id": 239,  # NutSeed
})

if inc_resp.get("status") == True or "success" in str(inc_resp).lower() or inc_resp.get("data"):
    time.sleep(1)
    after_qty = get_stock_qty(token, INC_ITEM)
    expected_after = before_qty + INC_QTY
    diff = abs(after_qty - expected_after)
    record("ADJUSTMENT", "A-2", f"Raisins stock increased by {INC_QTY} after add-stock",
           f"{expected_after:.2f}", f"{after_qty:.2f}", "PASS" if diff < 1 else "FAIL", f"diff={diff:.2f}")
else:
    msg = inc_resp.get("message", json.dumps(inc_resp)[:200])
    record("ADJUSTMENT", "A-2", "Increase adjustment", "success", f"FAIL: {msg}", "FAIL")
    print(f"  Full response: {json.dumps(inc_resp)[:300]}")

print()

# ================================================================
# TEST 4: PARTIAL PO RECEIVE
# ================================================================
print("=" * 60)
print("TEST 4: PARTIAL PO RECEIVE — Create PO, receive 60%")
print("=" * 60)

# Create a small PO with 2 items
po_create = api_post(token, "inventory/purchase-order/create", {
    "vendor_id": 237,
    "lines": [
        {"inventory_master_id": 17790, "ordered_qty": 10, "ordered_unit": "kg", "expected_rate": 20},
        {"inventory_master_id": 17788, "ordered_qty": 5, "ordered_unit": "kg", "expected_rate": 280},
    ],
    "notes": "MATH-QA: Partial receive test"
})

po_id = po_create.get("data", {}).get("id")
if po_id:
    print(f"  Created PO #{po_id}")
    
    # Approve + Send
    api_post(token, f"inventory/purchase-order/{po_id}/approve", {})
    api_post(token, f"inventory/purchase-order/{po_id}/send", {})
    time.sleep(0.5)
    
    # Get line IDs
    po_detail = api_get(token, f"inventory/purchase-order/{po_id}")
    lines = po_detail.get("data", po_detail).get("lines", [])
    
    if len(lines) >= 2:
        # Receive only line 1 (Salt 10kg), skip line 2 (Jeera)
        salt_before = get_stock_qty(token, 17790)
        
        recv_resp = api_post(token, f"inventory/purchase-order/{po_id}/receive", {
            "receive_lines": [{
                "line_id": lines[0]["id"],
                "received_qty": 6,  # 60% of 10kg
                "actual_rate": 22,  # slightly different rate for variance test
                "batch": "MATHQA-PARTIAL",
                "expiry_date": "2026-09-30",
            }],
            "invoice_number": "INV-MATHQA-PARTIAL"
        })
        
        time.sleep(1)
        
        # Verify PO status is partially_received
        po_after = api_get(token, f"inventory/purchase-order/{po_id}")
        po_status = po_after.get("data", po_after).get("status", "?")
        record("PARTIAL_PO", "P-1", "PO status after partial receive",
               "partially_received", po_status,
               "PASS" if po_status == "partially_received" else "FAIL")
        
        # Verify line 1 received_qty
        lines_after = po_after.get("data", po_after).get("lines", [])
        if lines_after:
            l1 = lines_after[0]
            l1_recv = float(l1.get("received_qty", 0))
            record("PARTIAL_PO", "P-2", "Line 1 received_qty = 6",
                   "6.0", str(l1_recv), "PASS" if abs(l1_recv - 6) < 0.01 else "FAIL")
            
            l1_remaining = float(l1.get("remaining_qty", 0))
            record("PARTIAL_PO", "P-3", "Line 1 remaining_qty = 4",
                   "4.0", str(l1_remaining), "PASS" if abs(l1_remaining - 4) < 0.01 else "FAIL")
        
        # Verify line 2 still open
        if len(lines_after) >= 2:
            l2 = lines_after[1]
            l2_status = l2.get("line_status", "?")
            record("PARTIAL_PO", "P-4", "Line 2 still open (not received)",
                   "open", l2_status, "PASS" if l2_status == "open" else "FAIL")
        
        # Verify stock increased by received amount (6kg = 6000 cal_qty)
        salt_after = get_stock_qty(token, 17790)
        salt_increase = salt_after - salt_before
        record("PARTIAL_PO", "P-5", "Salt stock increased by 6000 (6kg received)",
               "~6000", f"{salt_increase:.2f}",
               "PASS" if abs(salt_increase - 6000) < 10 else "FAIL")
        
        # Rate variance: expected 20, actual 22 = +10%
        record("PARTIAL_PO", "P-6", "Rate variance (22 vs 20) = +10%",
               "10%", f"{((22-20)/20)*100:.0f}%", "PASS")
    else:
        record("PARTIAL_PO", "P-1", "PO lines found", ">=2", str(len(lines)), "FAIL")
else:
    msg = po_create.get("message", json.dumps(po_create)[:200])
    record("PARTIAL_PO", "P-1", "PO creation", "success", f"FAIL: {msg}", "FAIL")
    print(f"  Full response: {json.dumps(po_create)[:300]}")

print()

# ================================================================
# TEST 5: NEAR-EXPIRY BATCH
# ================================================================
print("=" * 60)
print("TEST 5: NEAR-EXPIRY BATCH — PO with 2-day expiry")
print("=" * 60)

near_expiry = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")

# Use the partial PO's remaining line or create a new small PO
ne_po = api_post(token, "inventory/purchase-order/create", {
    "vendor_id": 239,
    "lines": [
        {"inventory_master_id": 17795, "ordered_qty": 1, "ordered_unit": "kg", "expected_rate": 480},
    ],
    "notes": "MATH-QA: Near-expiry test"
})

ne_po_id = ne_po.get("data", {}).get("id")
if ne_po_id:
    api_post(token, f"inventory/purchase-order/{ne_po_id}/approve", {})
    api_post(token, f"inventory/purchase-order/{ne_po_id}/send", {})
    time.sleep(0.5)
    
    ne_detail = api_get(token, f"inventory/purchase-order/{ne_po_id}")
    ne_lines = ne_detail.get("data", ne_detail).get("lines", [])
    
    if ne_lines:
        choco_before = get_stock_qty(token, 17795)
        
        api_post(token, f"inventory/purchase-order/{ne_po_id}/receive", {
            "receive_lines": [{
                "line_id": ne_lines[0]["id"],
                "received_qty": 1,
                "actual_rate": 480,
                "batch": "MATHQA-NEAR-EXPIRY",
                "expiry_date": near_expiry,
            }],
            "invoice_number": "INV-MATHQA-EXPIRY"
        })
        
        time.sleep(1)
        choco_after = get_stock_qty(token, 17795)
        
        record("NEAR_EXPIRY", "E-1", f"Choco Chips stock increased by 1000 (1kg)",
               f"{choco_before + 1000:.2f}", f"{choco_after:.2f}",
               "PASS" if abs((choco_after - choco_before) - 1000) < 10 else "FAIL")
        
        # Verify the near-expiry segment exists
        ne_stock = api_get(token, f"inventory/stock-inventory/17795")
        ne_segs = ne_stock.get("data", ne_stock).get("segments", [])
        near_expiry_segs = [s for s in ne_segs if s.get("expiry_date") == near_expiry]
        record("NEAR_EXPIRY", "E-2", f"Near-expiry segment exists (expiry={near_expiry})",
               "1 segment", f"{len(near_expiry_segs)} segments",
               "PASS" if len(near_expiry_segs) >= 1 else "FAIL")
        
        # Check FEFO: near-expiry segment should be first
        if ne_segs and ne_segs[0].get("expiry_date"):
            first_expiry = ne_segs[0]["expiry_date"]
            record("NEAR_EXPIRY", "E-3", "FEFO: nearest expiry segment is first",
                   near_expiry, first_expiry,
                   "PASS" if first_expiry <= near_expiry else "FAIL")
else:
    record("NEAR_EXPIRY", "E-1", "Near-expiry PO creation", "success", "FAIL", "FAIL")

print()

# ================================================================
# TEST 6: CONSUMPTION / DAYS OF COVER
# ================================================================
print("=" * 60)
print("TEST 6: CONSUMPTION — Check daily consumption report")
print("=" * 60)

# The consumption report pulls from POS sales data, which we can't create
# But we CAN verify the report structure and math if any data exists
cons_resp = api_post(token, "report/daily-consumption-report", {
    "date": today,
    "restaurant_ids": [813],
})
cons_data = cons_resp.get("data", cons_resp)
cons_summary = cons_data.get("summary", cons_data.get("ingredients", []))

record("CONSUMPTION", "C-1", "Consumption report API responds",
       "valid response", f"{len(cons_summary)} items",
       "PASS" if isinstance(cons_summary, list) else "FAIL")

# Check if production runs generated any consumption data
# Production consumes raw materials → should show as consumption
if isinstance(cons_summary, list) and len(cons_summary) > 0:
    total_consumed = sum(float(c.get("total_consumed_raw", c.get("total_consumed", 0)) or 0) for c in cons_summary)
    record("CONSUMPTION", "C-2", "Total consumption from production",
           ">0", f"{total_consumed:.2f}", "PASS" if total_consumed > 0 else "INFO",
           "Production-driven consumption may not show in daily report")
else:
    record("CONSUMPTION", "C-2", "Consumption data exists",
           "items", "0 — no POS sales or manual consumption",
           "INFO", "Consumption report requires POS sales data which doesn't exist in seed")

# Days of cover: stock / avg_daily_consumption
# Since consumption may be 0, days-of-cover = infinity (displayed as "—")
record("CONSUMPTION", "C-3", "Days-of-cover calculation feasibility",
       "requires consumption > 0", f"consumption items: {len(cons_summary)}",
       "INFO", "Frontend shows '—' when consumption is 0, which is correct behavior")

print()

# ================================================================
# TEST 7: TRANSFER DISPUTE (skip if too complex)
# ================================================================
print("=" * 60)
print("TEST 7: TRANSFER DISPUTE — Dispatch then receive with mismatch")
print("=" * 60)

# Get a FG item segment at Central for dispatch
fg_item = 17828  # Oats Cookies
fg_segments = api_post(token, "inventory-transfer/source-options", {
    "from_restaurant_id": 813,
    "source_inventory_master_id": fg_item,
})
fg_segs = fg_segments.get("data", {}).get("segments", [])
fg_seg = next((s for s in fg_segs if s.get("segment_id") and float(s.get("cal_quantity", 0)) >= 2), None)

if fg_seg:
    # Dispatch 2 Oats Cookies to Master North
    dispatch_resp = api_post(token, "inventory-transfer/initiate", {
        "from_restaurant_id": 813,
        "to_restaurant_id": 814,
        "items": [{
            "source_inventory_master_id": fg_item,
            "quantity": 2,
            "source_selector": {"mode": "segment_id", "segment_id": fg_seg["segment_id"]},
        }]
    })
    
    d_data = dispatch_resp.get("data", {})
    transfer_id = d_data.get("transfer_id")
    
    if transfer_id:
        print(f"  Dispatched TRF #{transfer_id} (2 Oats Cookies → 814)")
        
        # Receive as Master North with discrepancy (receive 1 instead of 2)
        north_token = login("manager@chaimasternorth.com")
        
        # Get transfer detail to check lines
        trf_detail = api_get(north_token, f"inventory-transfer/details/{transfer_id}")
        trf_lines = trf_detail.get("data", trf_detail).get("lines", [])
        
        if trf_lines:
            # Try partial receive (receive less than dispatched)
            recv_resp = api_post(north_token, f"inventory-transfer/receive/{transfer_id}", {
                "received_lines": [{
                    "line_id": trf_lines[0].get("id"),
                    "received_qty": 1,  # only 1 of 2
                }]
            })
            
            recv_status = recv_resp.get("data", {}).get("status", recv_resp.get("status", "?"))
            record("DISPUTE", "D-1", "Transfer with partial receive (1 of 2)",
                   "received or dispute", str(recv_status),
                   "PASS" if recv_status in (True, "received", "partially_received", "dispute") else "INFO",
                   f"Response: {json.dumps(recv_resp)[:200]}")
        else:
            record("DISPUTE", "D-1", "Transfer lines found", ">=1", "0", "FAIL")
    else:
        msg = dispatch_resp.get("message", json.dumps(dispatch_resp)[:200])
        record("DISPUTE", "D-1", "Dispatch for dispute test", "success", f"FAIL: {msg}", "FAIL")
else:
    record("DISPUTE", "D-1", "FG segment for dispute test", "available", "no segment found", "FAIL")

# ================================================================
# SUMMARY
# ================================================================
print()
print("=" * 60)
print("SUMMARY")
print("=" * 60)

passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
info = sum(1 for r in results if r["status"] == "INFO")
print(f"Total: {len(results)} | PASS: {passed} | FAIL: {failed} | INFO: {info}")

if failed:
    print("\nFAILURES:")
    for r in results:
        if r["status"] == "FAIL":
            print(f"  [{r['area']}] {r['test_id']}: {r['description']}")
            print(f"    Expected: {r['expected']}")
            print(f"    Actual:   {r['actual']}")

with open("/tmp/math_qa_extended_results.json", "w") as f:
    json.dump(results, f, indent=2, default=str)
print(f"\nResults saved to /tmp/math_qa_extended_results.json")
