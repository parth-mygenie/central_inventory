"""
CR-023 Phase 0 Part 2: Seed stock for remaining items + push to stores
"""
import requests
import json
import random
from datetime import datetime, timedelta

API_URL = None
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]
            break

BASE = f"{API_URL}/api"

def login(email, password):
    r = requests.post(f"{BASE}/proxy/auth/login", json={"email": email, "password": password, "fcm_token": "seed"})
    d = r.json()
    return d.get("token") or (d.get("data") or {}).get("token")

TOKEN = login("abhishek@kalabahia.com", "Qplazm@10")
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

today = datetime.now()

# Get vendors
vendors_r = requests.get(f"{BASE}/proxy/v2/inventory/get-vendor", headers=HEADERS)
vendors = vendors_r.json() if isinstance(vendors_r.json(), list) else vendors_r.json().get("data", [])
vendor_id = vendors[0]["id"] if vendors else 16

# Get all inventory items
r = requests.get(f"{BASE}/proxy/v2/inventory/get-inventory-master", headers=HEADERS)
all_items = r.json().get("data", r.json()) if isinstance(r.json(), dict) else r.json()
print(f"Total items: {len(all_items)}")

# Check which items already have stock
r2 = requests.get(f"{BASE}/proxy/v2/inventory/stock-inventory", headers=HEADERS)
stock_items = {s["id"]: float(s.get("display_qty", 0) or 0) for s in r2.json().get("current_stocks", [])}

# Seed stock for ALL items
seeded = 0
for i, item in enumerate(all_items):
    iid = item["id"]
    title = item.get("stock_title", "?")
    unit = item.get("unit", "kg")
    current_qty = stock_items.get(iid, 0)

    # Skip old demo items (Cooking Oil, etc.) and test items
    if title in ("Cooking Oil", "maida", "patri", "red meat", "TEST_DELETE_ME", "UNIT_TEST_PIECE"):
        continue

    # Skip if already has good stock
    if current_qty > 10:
        continue

    # Determine scenario based on position
    idx = i % 10
    if idx < 3:
        # Good stock, far expiry
        qty = random.randint(50, 200)
        expiry = (today + timedelta(days=random.randint(90, 365))).strftime("%Y-%m-%d")
        batch = f"CH-{title[:6].replace(' ','-')}-{random.randint(100,999)}"
    elif idx < 5:
        # Near expiry (5-14 days)
        qty = random.randint(10, 40)
        expiry = (today + timedelta(days=random.randint(5, 14))).strftime("%Y-%m-%d")
        batch = f"NEAR-{title[:6].replace(' ','-')}-{random.randint(100,999)}"
    elif idx < 7:
        # Low stock (below typical min_qty_alert of 5-20)
        qty = random.randint(1, 4)
        expiry = (today + timedelta(days=random.randint(30, 120))).strftime("%Y-%m-%d")
        batch = f"LOW-{title[:6].replace(' ','-')}-{random.randint(100,999)}"
    else:
        # Medium stock
        qty = random.randint(15, 60)
        expiry = (today + timedelta(days=random.randint(45, 180))).strftime("%Y-%m-%d")
        batch = f"MED-{title[:6].replace(' ','-')}-{random.randint(100,999)}"

    payload = {
        "quantity": qty,
        "unit": unit,
        "vendor_id": vendor_id,
        "batch": batch,
        "expiry_date": expiry,
    }

    r = requests.post(f"{BASE}/proxy/v2/inventory/add-stock/{iid}", json=payload, headers=HEADERS)
    if r.status_code < 400 and r.json().get("success", True):
        seeded += 1
    else:
        err = str(r.json())[:80]
        if "expiry" not in err.lower():
            print(f"  WARN {title}: {err}")

    if seeded % 20 == 0 and seeded > 0:
        print(f"  Progress: {seeded} seeded")

print(f"\nStock seeded: {seeded}")

# Push catalogue to child stores so they have items too
print("\n=== Pushing catalogue to child stores ===")
# Get children
r = requests.get(f"{BASE}/proxy/v2/franchise/list?limit=10", headers=HEADERS)
children = r.json().get("data", {}).get("children", [])
print(f"Children: {len(children)}")

for child in children[:4]:
    cid = child.get("id")
    cname = child.get("name", "?")
    print(f"  Pushing to {cname} (id={cid})...")
    r = requests.post(f"{BASE}/proxy/v2/franchise/push/{cid}",
                      json={"push_food_bundle": True}, headers=HEADERS)
    d = r.json()
    print(f"    Result: {str(d)[:120]}")

# Final stock count
r3 = requests.get(f"{BASE}/proxy/v2/inventory/stock-inventory", headers=HEADERS)
cs = r3.json().get("current_stocks", [])
low = sum(1 for s in cs if s.get("is_low_stock"))
with_stock = sum(1 for s in cs if float(s.get("display_qty", 0) or 0) > 0)
print(f"\n=== FINAL STATE ===")
print(f"Total items: {len(cs)}")
print(f"With stock: {with_stock}")
print(f"Low stock: {low}")
print(f"Out of stock: {len(cs) - with_stock}")
