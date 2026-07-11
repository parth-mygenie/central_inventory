#!/usr/bin/env python3
"""Phase 9c: Masters dispatch FG to their Outlets.
North (814) → N1-N6 (816-821)
South (815) → S1-S6 (822-827)"""

import requests, json, sys, time

with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]

def login(email):
    r = requests.post(f"{API_URL}/api/proxy/auth/login",
        json={"email": email, "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
    return r.json()["token"]

def get_fg_with_segments(token, from_rid):
    """Get FG items with stock and their segment IDs"""
    H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.get(f"{API_URL}/api/proxy/v2/inventory/stock-inventory", headers=H)
    stocks = r.json().get("current_stocks", [])
    fg = []
    for s in stocks:
        qty = float(s.get("cal_quantity", 0))
        if qty > 0:
            # Get segment
            sr = requests.post(f"{API_URL}/api/proxy/v2/inventory-transfer/source-options", headers=H,
                json={"from_restaurant_id": from_rid, "source_inventory_master_id": s["id"]})
            segs = sr.json().get("data", {}).get("segments", [])
            seg = next((sg for sg in segs if sg.get("segment_id") and float(sg.get("cal_quantity", 0)) > 0), None)
            if seg:
                fg.append({"id": s["id"], "title": s["stock_title"], "qty": qty, "seg_id": seg["segment_id"], "seg_qty": float(seg["cal_quantity"])})
            time.sleep(0.15)
    return fg

def dispatch_and_receive(sender_token, from_rid, to_rid, to_label, items):
    """Dispatch items and immediately receive at destination"""
    H = {"Authorization": f"Bearer {sender_token}", "Content-Type": "application/json"}
    payload_items = []
    for item in items:
        payload_items.append({
            "source_inventory_master_id": item["id"],
            "quantity": item["dispatch_qty"],
            "source_selector": {"mode": "segment_id", "segment_id": item["seg_id"]},
        })
    
    payload = {"from_restaurant_id": from_rid, "to_restaurant_id": to_rid, "items": payload_items}
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory-transfer/initiate", headers=H, json=payload)
    d = r.json()
    
    if d.get("status") != True:
        print(f"    DISPATCH FAIL → {to_label}: {d.get('message', json.dumps(d)[:150])}")
        return False
    
    tid = d.get("data", {}).get("transfer_id", "?")
    print(f"    DISPATCHED → {to_label}: Transfer #{tid}")
    return tid

# ===== MASTER NORTH (814) → 6 Outlets =====
print("=== Master North (814) → Outlets N1-N6 ===\n")
north_token = login("manager@chaimasternorth.com")
north_fg = get_fg_with_segments(north_token, 814)
print(f"North FG items: {len(north_fg)}")

# Each outlet gets a subset of items (round-robin distribution)
north_outlets = [816, 817, 818, 819, 820, 821]
north_outlet_labels = ["N1", "N2", "N3", "N4", "N5", "N6"]

# Dispatch 1 piece of each item available to first 3 outlets
# (with only 1 piece per item, we can only send to 1 outlet each)
for i, (outlet_rid, label) in enumerate(zip(north_outlets[:3], north_outlet_labels[:3])):
    # Give every 3rd item to this outlet
    items_for_outlet = []
    for j, item in enumerate(north_fg):
        if j % 3 == i and item["seg_qty"] >= 1:
            items_for_outlet.append({**item, "dispatch_qty": 1})
    
    if items_for_outlet:
        tid = dispatch_and_receive(north_token, 814, outlet_rid, f"Outlet {label} ({outlet_rid})", items_for_outlet)
    time.sleep(0.5)

# ===== MASTER SOUTH (815) → 6 Outlets =====
print(f"\n=== Master South (815) → Outlets S1-S6 ===\n")
south_token = login("manager@chaimastersouth.com")
south_fg = get_fg_with_segments(south_token, 815)
print(f"South FG items: {len(south_fg)}")

south_outlets = [822, 823, 824, 825, 826, 827]
south_outlet_labels = ["S1", "S2", "S3", "S4", "S5", "S6"]

for i, (outlet_rid, label) in enumerate(zip(south_outlets[:3], south_outlet_labels[:3])):
    items_for_outlet = []
    for j, item in enumerate(south_fg):
        if j % 3 == i and item["seg_qty"] >= 1:
            items_for_outlet.append({**item, "dispatch_qty": 1})
    
    if items_for_outlet:
        tid = dispatch_and_receive(south_token, 815, outlet_rid, f"Outlet {label} ({outlet_rid})", items_for_outlet)
    time.sleep(0.5)

print("\n=== Phase 9c COMPLETE ===")
