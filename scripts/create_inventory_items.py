#!/usr/bin/env python3
"""Phase 4.2: Create all raw material inventory items for chai (RID 813)"""

import subprocess
import json
import time
import os

API_URL = "https://c933daf8-92c2-4edb-a4dd-0782f6409f84.preview.emergentagent.com"

# Login
login_resp = subprocess.run(
    ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/auth/login",
     "-H", "Content-Type: application/json",
     "-d", json.dumps({"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})],
    capture_output=True, text=True
)
TOKEN = json.loads(login_resp.stdout)["token"]
print(f"Token obtained: {len(TOKEN)} chars")

# Category IDs
CAT = {
    "Flours": 1548,
    "Fats & Dairy": 1549,
    "Sweeteners": 1550,
    "Leavening": 1551,
    "Nuts & Seeds": 1552,
    "Spices & Flavoring": 1553,
    "Dry Fruits & Others": 1554,
    "Fresh Produce": 1555,
}

# All raw materials: (name, unit, category, min_alert)
ITEMS = [
    # Flours
    ("Whole Wheat Flour", "kg", "Flours", 5),
    ("Ragi Flour", "kg", "Flours", 2),
    ("Jowar Flour", "kg", "Flours", 1),
    ("Maida", "kg", "Flours", 5),
    ("Rice Flour", "kg", "Flours", 1),
    # Fats & Dairy
    ("GSM", "kg", "Fats & Dairy", 5),
    ("Lilly Margarine", "kg", "Fats & Dairy", 3),
    ("Nutrelite Butter", "kg", "Fats & Dairy", 1),
    ("Milk", "litre", "Fats & Dairy", 5),
    ("Oil", "litre", "Fats & Dairy", 2),
    # Sweeteners
    ("Jaggery Powder", "kg", "Sweeteners", 5),
    ("Icing Sugar", "kg", "Sweeteners", 1),
    ("Sugar", "kg", "Sweeteners", 2),
    # Leavening
    ("Baking Powder", "kg", "Leavening", 0.5),
    ("Baking Soda", "kg", "Leavening", 0.5),
    ("Egg Replacer", "kg", "Leavening", 1),
    # Nuts & Seeds
    ("Almonds", "kg", "Nuts & Seeds", 1),
    ("Cashew", "kg", "Nuts & Seeds", 1),
    ("Peanuts", "kg", "Nuts & Seeds", 1),
    ("White Sesame", "kg", "Nuts & Seeds", 1),
    ("White Till Powder", "kg", "Nuts & Seeds", 0.5),
    ("Sunflower Seeds", "kg", "Nuts & Seeds", 0.5),
    ("Pumpkin Seeds", "kg", "Nuts & Seeds", 0.5),
    # Spices & Flavoring
    ("Vanilla Essence", "litre", "Spices & Flavoring", 0.5),
    ("Elachi Powder", "kg", "Spices & Flavoring", 0.2),
    ("Ajwain", "kg", "Spices & Flavoring", 0.5),
    ("Jeera", "kg", "Spices & Flavoring", 0.5),
    ("Chilli Powder", "kg", "Spices & Flavoring", 0.5),
    ("Salt", "kg", "Spices & Flavoring", 2),
    # Dry Fruits & Others
    ("Raisins", "kg", "Dry Fruits & Others", 1),
    ("Dates", "kg", "Dry Fruits & Others", 1),
    ("Oats", "kg", "Dry Fruits & Others", 2),
    ("Coconut Powder", "kg", "Dry Fruits & Others", 1),
    ("Choco Chips", "kg", "Dry Fruits & Others", 1),
    ("Wheat Bran", "kg", "Dry Fruits & Others", 0.5),
    # Fresh Produce
    ("Carrot", "kg", "Fresh Produce", 1),
    ("Green Chilli", "kg", "Fresh Produce", 0.5),
    ("Mint", "kg", "Fresh Produce", 0.5),
    ("Curry Leaves", "kg", "Fresh Produce", 0.5),
    ("Coriander Leaves", "kg", "Fresh Produce", 0.5),
    ("Kasuri Methi", "kg", "Fresh Produce", 0.5),
    ("Garlic", "kg", "Fresh Produce", 1),
]

print(f"\nCreating {len(ITEMS)} inventory items...")
created = 0
failed = 0

for name, unit, category, min_alert in ITEMS:
    cat_id = CAT[category]
    payload = {
        "stock_title": name,
        "unit": unit,
        "category_id": cat_id,
        "min_qty_alert": min_alert,
    }
    
    resp = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/v2/inventory/add-inventory",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-d", json.dumps(payload)],
        capture_output=True, text=True
    )
    
    try:
        data = json.loads(resp.stdout)
        if data.get("success") or data.get("data", {}).get("id"):
            item_id = data.get("data", {}).get("id", "?")
            print(f"  ✓ {name:<25} unit={unit:<8} cat={category:<20} → ID={item_id}")
            created += 1
        else:
            print(f"  ✗ {name:<25} FAIL: {json.dumps(data)[:150]}")
            failed += 1
    except Exception as e:
        print(f"  ✗ {name:<25} ERROR: {e}")
        failed += 1
    
    time.sleep(0.3)  # Rate limit

print(f"\nDone: {created} created, {failed} failed out of {len(ITEMS)}")
