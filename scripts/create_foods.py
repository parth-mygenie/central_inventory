#!/usr/bin/env python3
"""Phase 5.2: Create 18 food products"""

import subprocess, json, time

API_URL = "https://c933daf8-92c2-4edb-a4dd-0782f6409f84.preview.emergentagent.com"
TOKEN = json.loads(subprocess.run(
    ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/auth/login",
     "-H", "Content-Type: application/json",
     "-d", json.dumps({"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})],
    capture_output=True, text=True
).stdout)["token"]

FOODS = [
    # Jaggery Cookies (cat 7900)
    ("Sesame Cookies With Jaggery", 7900, 25),
    ("Cashew Cookies With Jaggery", 7900, 30),
    ("Whole wheat Elachi Cookies With Jaggery", 7900, 25),
    ("Coconut Cookies With Jaggery", 7900, 25),
    ("Dates Cookies With Jaggery", 7900, 28),
    ("Ajwain Cookies With Jaggery", 7900, 25),
    ("Jeera Cookies With Jaggery", 7900, 25),
    ("Almond Cookies With Jaggery", 7900, 35),
    ("Ragi Cookies With Jaggery", 7900, 25),
    ("Oats Cookies With Jaggery", 7900, 25),
    ("Choco Chip Cookies With Jaggery", 7900, 30),
    ("Ragi Elachi Cookies With Jaggery", 7900, 25),
    ("Multi Millet Cashew Cookies With Jaggery", 7900, 30),
    ("Multiseed Cookies With Jaggery", 7900, 35),
    ("Carrot Cookies With Jaggery", 7900, 25),
    ("Wheat Bran Cookies With Jaggery", 7900, 25),
    # Sugar Cookies (cat 7901)
    ("Sweet Masala Cookies With Sugar", 7901, 20),
    # Kharis (cat 7902)
    ("Methi Khari", 7902, 15),
    # NOTE: Garlic Khari will be added separately as 19th
]

print(f"Creating {len(FOODS)} food products...\n")
created = 0
for name, cat_id, price in FOODS:
    payload = {
        "name": name,
        "category_id": cat_id,
        "price": price,
        "tax": 0,
        "food_type": "veg",
        "status": 1,
    }
    resp = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/v2/product/add-food",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-d", json.dumps(payload)],
        capture_output=True, text=True
    )
    try:
        d = json.loads(resp.stdout)
        if d.get("success") or d.get("data", {}).get("id"):
            fid = d.get("data", {}).get("id", d.get("food_id", "?"))
            print(f"  ✓ {name:<48} → ID={fid}")
            created += 1
        else:
            print(f"  ✗ {name:<48} FAIL: {json.dumps(d)[:150]}")
    except Exception as e:
        print(f"  ✗ {name:<48} ERROR: {e} | {resp.stdout[:100]}")
    time.sleep(0.3)

# Add Garlic Khari
payload = {"name": "Garlic Khari", "category_id": 7902, "price": 15, "tax": 0, "food_type": "veg", "status": 1}
resp = subprocess.run(
    ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/v2/product/add-food",
     "-H", "Content-Type: application/json",
     "-H", f"Authorization: Bearer {TOKEN}",
     "-d", json.dumps(payload)],
    capture_output=True, text=True
)
d = json.loads(resp.stdout)
fid = d.get("data", {}).get("id", d.get("food_id", "?"))
print(f"  ✓ {'Garlic Khari':<48} → ID={fid}")
created += 1

print(f"\nTotal: {created} foods created")
