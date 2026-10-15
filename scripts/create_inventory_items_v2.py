#!/usr/bin/env python3
"""Phase 4.2: Create all raw material inventory items - array format"""

import subprocess, json, time

API_URL = "https://c933daf8-92c2-4edb-a4dd-0782f6409f84.preview.emergentagent.com"

login_resp = subprocess.run(
    ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/auth/login",
     "-H", "Content-Type: application/json",
     "-d", json.dumps({"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})],
    capture_output=True, text=True
)
TOKEN = json.loads(login_resp.stdout)["token"]

CAT = {
    "Flours": 1548, "Fats & Dairy": 1549, "Sweeteners": 1550,
    "Leavening": 1551, "Nuts & Seeds": 1552, "Spices & Flavoring": 1553,
    "Dry Fruits & Others": 1554, "Fresh Produce": 1555,
}

# (name, unit, category, min_alert) - Whole Wheat Flour already created in test
ITEMS = [
    # Flours (Wheat Flour already done)
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

# Send in batches of 5 (array format)
BATCH_SIZE = 5
total_created = 0

for i in range(0, len(ITEMS), BATCH_SIZE):
    batch = ITEMS[i:i+BATCH_SIZE]
    payload = [{"stock_title": name, "unit": unit, "category_id": CAT[cat], "min_qty_alert": alert} for name, unit, cat, alert in batch]
    
    resp = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/v2/inventory/add-inventory",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-d", json.dumps(payload)],
        capture_output=True, text=True
    )
    
    try:
        data = json.loads(resp.stdout)
        if data.get("success"):
            names = [n for n, _, _, _ in batch]
            print(f"  ✓ Batch {i//BATCH_SIZE+1}: {', '.join(names)}")
            total_created += len(batch)
        else:
            print(f"  ✗ Batch {i//BATCH_SIZE+1} FAIL: {json.dumps(data)[:200]}")
    except Exception as e:
        print(f"  ✗ Batch {i//BATCH_SIZE+1} ERROR: {e}")
    
    time.sleep(0.5)

print(f"\nCreated {total_created} items (+ 1 earlier = {total_created+1} total)")

# Verify
resp = subprocess.run(
    ["curl", "-s", f"{API_URL}/api/proxy/v2/inventory/get-inventory-master",
     "-H", f"Authorization: Bearer {TOKEN}"],
    capture_output=True, text=True
)
items = json.loads(resp.stdout)
if isinstance(items, dict):
    items = items.get("data", [])
print(f"\nInventory Master now has: {len(items)} items")
for it in items:
    print(f"  ID={it.get('id','?'):>6}  {it.get('stock_title','?'):<25} {it.get('unit','?'):<8} cat={it.get('category_id','?')}")
