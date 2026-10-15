#!/usr/bin/env python3
"""Phase 7: Create 6 POs (3 primary + 3 overlap), approve, send, receive.
Creates stock for raw materials with vendor intelligence pricing."""

import requests, json, sys, time
from datetime import datetime, timedelta

with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]

r = requests.post(f"{API_URL}/api/proxy/auth/login",
    json={"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
token = r.json()["token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

EXPIRY = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
BATCH_DATE = datetime.now().strftime("%Y%m%d")

# Vendor IDs
FARMFRESH = 237   # Flours, Jaggery, Spices, Baking
DAIRY     = 238   # GSM, Margarine, Milk, Oil, Egg Replacer, Vanilla
NUTSEED   = 239   # Nuts, Seeds, Dry Fruits, Oats, Choco, Fresh

# PO definitions: (vendor_id, vendor_label, items: [(inv_id, name, qty, unit, rate)])
POS = [
    # PO 1: Farmfresh — Primary for flours, jaggery, spices, baking
    (FARMFRESH, "Farmfresh-Primary", [
        (17772, "Whole Wheat Flour", 25, "kg", 45),
        (17773, "Ragi Flour", 10, "kg", 65),
        (17774, "Jowar Flour", 5, "kg", 70),
        (17775, "Maida", 30, "kg", 35),
        (17776, "Rice Flour", 5, "kg", 50),
        (17810, "Jaggery Powder", 20, "kg", 80),
        (17778, "Icing Sugar", 5, "kg", 55),
        (17779, "Sugar", 10, "kg", 42),
        (17780, "Baking Powder", 3, "kg", 250),
        (17781, "Baking Soda", 2, "kg", 120),
        (17814, "Elachi Powder", 1, "kg", 1200),
        (17815, "Ajwain", 2, "kg", 350),
        (17788, "Jeera", 2, "kg", 280),
        (17789, "Chilli Powder", 2, "kg", 220),
        (17790, "Salt", 5, "kg", 20),
    ]),
    # PO 2: Dairy & Fats — Primary for fats, dairy, leavening
    (DAIRY, "Dairy-Primary", [
        (17777, "GSM", 20, "kg", 320),
        (17806, "Lilly Margarine", 10, "kg", 280),
        (17807, "Nutrelite Butter", 5, "kg", 450),
        (17808, "Milk", 30, "ltr", 55),
        (17809, "Oil", 15, "ltr", 140),
        (17782, "Egg Replacer", 5, "kg", 380),
        (17813, "Vanilla Essence", 2, "ltr", 650),
    ]),
    # PO 3: NutSeed — Primary for nuts, seeds, dry fruits, fresh
    (NUTSEED, "NutSeed-Primary", [
        (17783, "Almonds", 5, "kg", 850),
        (17784, "Cashew", 5, "kg", 780),
        (17785, "Peanuts", 5, "kg", 160),
        (17786, "White Sesame", 3, "kg", 220),
        (17787, "White Till Powder", 2, "kg", 260),
        (17811, "Sunflower Seeds", 2, "kg", 300),
        (17812, "Pumpkin Seeds", 2, "kg", 450),
        (17791, "Raisins", 5, "kg", 320),
        (17792, "Dates", 5, "kg", 280),
        (17793, "Oats", 10, "kg", 120),
        (17794, "Coconut Powder", 3, "kg", 200),
        (17795, "Choco Chips", 3, "kg", 480),
        (17796, "Wheat Bran", 3, "kg", 60),
        (17797, "Carrot", 5, "kg", 40),
        (17798, "Green Chilli", 3, "kg", 80),
        (17799, "Mint", 2, "kg", 120),
        (17800, "Curry Leaves", 2, "kg", 100),
        (17801, "Coriander Leaves", 2, "kg", 60),
        (17802, "Kasuri Methi", 2, "kg", 350),
        (17803, "Garlic", 5, "kg", 180),
    ]),
    # PO 4: Dairy overlap — Wheat Flour at +15% (for vendor price comparison)
    (DAIRY, "Dairy-Overlap", [
        (17772, "Whole Wheat Flour", 5, "kg", 52),  # 45 * 1.15 ≈ 52
    ]),
    # PO 5: NutSeed overlap — Jaggery Powder at +10% (TIP banner trigger)
    (NUTSEED, "NutSeed-Overlap", [
        (17810, "Jaggery Powder", 5, "kg", 88),  # 80 * 1.10 = 88
    ]),
    # PO 6: Farmfresh overlap — GSM at +20% (cheapest vendor badge)
    (FARMFRESH, "Farmfresh-Overlap", [
        (17777, "GSM", 5, "kg", 384),  # 320 * 1.20 = 384
    ]),
]

po_ids = []

for vendor_id, label, items in POS:
    # Step 1: Create PO
    lines = [{"inventory_master_id": inv_id, "ordered_qty": qty, "ordered_unit": unit, "expected_rate": rate}
             for inv_id, name, qty, unit, rate in items]
    payload = {"vendor_id": vendor_id, "lines": lines, "notes": f"Seed PO: {label}"}
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory/purchase-order/create", headers=H, json=payload)
    d = r.json()
    po_id = d.get("data", {}).get("id") or d.get("purchase_order", {}).get("id") or d.get("id") or d.get("purchase_order_id")
    if not po_id:
        print(f"  FAIL CREATE {label}: {json.dumps(d)[:200]}")
        sys.exit(1)
    print(f"  CREATE {label}: PO #{po_id}")

    # Step 2: Approve
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory/purchase-order/{po_id}/approve", headers=H, json={})
    d = r.json()
    print(f"  APPROVE PO #{po_id}: {d.get('message', 'OK')}")

    # Step 3: Send
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory/purchase-order/{po_id}/send", headers=H, json={})
    d = r.json()
    print(f"  SEND PO #{po_id}: {d.get('message', 'OK')}")

    # Step 4: Get detail to get line IDs for receive
    time.sleep(0.5)
    r = requests.get(f"{API_URL}/api/proxy/v2/inventory/purchase-order/{po_id}", headers=H)
    detail = r.json()
    po_data = detail.get("data", detail.get("purchase_order", detail))
    po_lines = po_data.get("lines", po_data.get("items", []))

    # Step 5: Receive
    receive_lines = []
    for i, (inv_id, name, qty, unit, rate) in enumerate(items):
        line_id = po_lines[i].get("id") if i < len(po_lines) else None
        if line_id:
            receive_lines.append({
                "line_id": line_id,
                "received_qty": qty,
                "actual_rate": rate,
                "batch": f"{label}-{BATCH_DATE}",
                "expiry_date": EXPIRY,
            })

    if receive_lines:
        r = requests.post(f"{API_URL}/api/proxy/v2/inventory/purchase-order/{po_id}/receive",
                          headers=H, json={"lines": receive_lines, "invoice_number": f"INV-{label}"})
        d = r.json()
        if "exception" in d:
            print(f"  FAIL RECEIVE PO #{po_id}: {json.dumps(d)[:200]}")
            sys.exit(1)
        print(f"  RECEIVE PO #{po_id}: {len(receive_lines)} lines OK")
    else:
        print(f"  WARN: No line IDs found for PO #{po_id} — skipping receive")

    po_ids.append(po_id)
    time.sleep(0.3)

print(f"\n=== PHASE 7 SUMMARY ===")
print(f"Created + Approved + Sent + Received: {len(po_ids)}/6 POs")
print(f"PO IDs: {po_ids}")
