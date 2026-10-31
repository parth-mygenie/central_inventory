#!/usr/bin/env python3
"""Phase 9: Distribute FG from Central (813) to Masters (814, 815)."""

import requests, json, sys, time

with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]

def login(email):
    r = requests.post(f"{API_URL}/api/proxy/auth/login",
        json={"email": email, "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
    return r.json()["token"]

token = login("owner@chai.com")
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Get FG items with stock
r = requests.get(f"{API_URL}/api/proxy/v2/inventory/stock-inventory", headers=H)
stocks = r.json().get("current_stocks", [])
fg_items = []
for s in stocks:
    qty = float(s.get("cal_quantity", 0))
    title = s.get("stock_title", "")
    if qty >= 2 and ("cookie" in title.lower() or "khari" in title.lower()):
        fg_items.append({"id": s["id"], "title": title, "qty": qty})

print(f"FG items available for dispatch: {len(fg_items)}\n")

# For each item, get source segments and dispatch to both masters
def dispatch_to_master(master_rid, items_segments, label):
    payload_items = []
    for inv_id, qty, seg_id in items_segments:
        payload_items.append({
            "source_inventory_master_id": inv_id,
            "quantity": int(qty),
            "source_selector": {"mode": "segment_id", "segment_id": seg_id},
        })
    
    payload = {"from_restaurant_id": 813, "to_restaurant_id": master_rid, "items": payload_items}
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory-transfer/initiate", headers=H, json=payload)
    d = r.json()
    if d.get("status") == True:
        tid = d.get("data", {}).get("transfer_id", "?")
        ref = d.get("data", {}).get("reference_code", "?")
        lines = len(d.get("data", {}).get("lines", []))
        print(f"  {label}: Transfer {ref} (ID={tid}), {lines} items dispatched")
        return True
    else:
        print(f"  {label}: FAIL — {d.get('message', json.dumps(d)[:200])}")
        return False

# Gather segments for each FG item
north_items = []
south_items = []

for item in sorted(fg_items, key=lambda x: x["title"]):
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory-transfer/source-options", headers=H,
        json={"from_restaurant_id": 813, "source_inventory_master_id": item["id"]})
    segs = r.json().get("data", {}).get("segments", [])
    
    # Find segment with stock
    seg = None
    for s in segs:
        if s.get("segment_id") and float(s.get("cal_quantity", 0)) > 0:
            seg = s
            break
    
    if not seg:
        print(f"  SKIP {item['title']}: no valid segment")
        continue
    
    avail = int(float(seg["cal_quantity"]))
    seg_id = seg["segment_id"]
    
    # Split 60/40 between North/South
    north_qty = max(1, int(avail * 0.6))
    south_qty = max(1, min(avail - north_qty, int(avail * 0.4)))
    
    if north_qty > 0:
        north_items.append((item["id"], north_qty, seg_id))
    if south_qty > 0:
        south_items.append((item["id"], south_qty, seg_id))
    
    print(f"  {item['title']}: {avail} avail → N:{north_qty}, S:{south_qty}")
    time.sleep(0.2)

print(f"\n--- Dispatching to Master North (814): {len(north_items)} items ---")
dispatch_to_master(814, north_items, "North")

time.sleep(1)

print(f"\n--- Dispatching to Master South (815): {len(south_items)} items ---")
dispatch_to_master(815, south_items, "South")

print("\n=== Phase 9: Central→Masters COMPLETE ===")
