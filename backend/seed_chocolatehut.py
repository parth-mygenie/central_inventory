"""
CR-023 Phase 0: ChocolateHut Data Seed Script
Seeds 158 inventory items from owner's Excel + stock batches + transfers + wastage
All via POS API calls (no direct DB)
"""
import requests
import json
import time
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

TOKEN_CENTRAL = login("abhishek@kalabahia.com", "Qplazm@10")
assert TOKEN_CENTRAL, "Central login failed"
HEADERS = {"Authorization": f"Bearer {TOKEN_CENTRAL}", "Content-Type": "application/json"}

TOKEN_OUTLET = login("owner@demofranchise1.com", "Qplazm@10")
HEADERS_OUTLET = {"Authorization": f"Bearer {TOKEN_OUTLET}", "Content-Type": "application/json"}

TOKEN_MASTER = login("owner@democentral1.com", "Qplazm@10")
HEADERS_MASTER = {"Authorization": f"Bearer {TOKEN_MASTER}", "Content-Type": "application/json"}

print(f"Logged in: Central={TOKEN_CENTRAL[:10]}..., Outlet={TOKEN_OUTLET[:10]}..., Master={TOKEN_MASTER[:10]}...")

# ── Step 1: Create inventory categories ─────────────────────────
print("\n=== Step 1: Create Inventory Categories ===")

CATEGORIES = [
    "Chocolate Bars",
    "Gift Boxes & Hampers",
    "Specialty & Kunafa",
    "Twist Collection",
    "Dragees & Bites",
    "Florentine & Premium",
    "Bulk & Fountain",
]

cat_ids = {}
for cat_name in CATEGORIES:
    r = requests.post(f"{BASE}/proxy/v2/inventory/stock-item-categories/store",
                      json={"category_name": cat_name}, headers=HEADERS)
    d = r.json()
    cid = d.get("data", {}).get("id") or d.get("id")
    if cid:
        cat_ids[cat_name] = cid
        print(f"  Created category: {cat_name} → id={cid}")
    else:
        print(f"  WARN category {cat_name}: {str(d)[:100]}")

# If category creation returned no ID, fetch all and map
if not all(cat_ids.values()):
    r = requests.get(f"{BASE}/proxy/v2/inventory/stock-item-categories", headers=HEADERS)
    for c in r.json().get("data", []):
        name = c.get("category_name", c.get("name", ""))
        if name in CATEGORIES:
            cat_ids[name] = c["id"]
    print(f"  Resolved categories: {cat_ids}")

# ── Step 2: Upload 158 items as inventory ingredients ────────────
print("\n=== Step 2: Upload ChocolateHut Inventory Items ===")

# Items from Excel with weight/unit inference and category assignment
ITEMS = [
    # Chocolate Bars (category: "Chocolate Bars")
    ("DARK CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("DARK 45% CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("DARK 75% CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("CRACKEL CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("BUTTERSCOTCH CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("HAZELNUT CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("CHILLI CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("CRANBERRY CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("MINT CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("PINK HIMALAYAN SALT BAR", 80, "gm", "Chocolate Bars"),
    ("BLUEBERRY CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("ORANGE CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("VALENTINE CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("MILK CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("CAPPUCCINO CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("ROASTED ALMOND BAR", 80, "gm", "Chocolate Bars"),
    ("FRUIT N NUT CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("HAPPY BIRTHDAY BAR", 80, "gm", "Chocolate Bars"),
    ("CASHEW CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("WHITE CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("PAAN CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("COOKIE N CREAM CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("SUGAR FREE CHOCOLATE BAR", 80, "gm", "Chocolate Bars"),
    ("CRUNCHY CARAMEL BAR", 25, "gm", "Chocolate Bars"),
    ("ENERGY BAR", 25, "gm", "Chocolate Bars"),
    ("SIXCER BAR", 50, "gm", "Chocolate Bars"),
    ("CRISPY FRUIT BAR", 28, "gm", "Chocolate Bars"),
    ("PISTA KUNAFA BAR", 100, "gm", "Specialty & Kunafa"),
    ("NUTELLA KUNAFA BAR", 100, "gm", "Specialty & Kunafa"),
    ("BISCOFF KUNAFA BAR", 100, "gm", "Specialty & Kunafa"),

    # Florentine & Premium
    ("FLORENTINE CHOCOLATE BAR ALMOND", 200, "gm", "Florentine & Premium"),
    ("FLORENTINE CHOCOLATE BAR MIX NUT", 200, "gm", "Florentine & Premium"),
    ("FLORENTINE HAZELNUT", 250, "gm", "Florentine & Premium"),
    ("FLORENTINE PISTACHIO", 300, "gm", "Florentine & Premium"),
    ("ALMOND FLORENTINE", 200, "gm", "Florentine & Premium"),

    # Dragees & Bites
    ("ALMOND KISSES", 25, "gm", "Dragees & Bites"),
    ("GOLD BISCUIT", 35, "gm", "Dragees & Bites"),
    ("CHOCO BIX", 24, "gm", "Dragees & Bites"),
    ("CHOCO BIX BUNCH", 120, "gm", "Dragees & Bites"),
    ("CHOCO DATES", 100, "gm", "Dragees & Bites"),
    ("CHOCO DIL", 90, "gm", "Dragees & Bites"),
    ("DB DARK ALMOND", 80, "gm", "Dragees & Bites"),
    ("DB MILK ALMOND", 80, "gm", "Dragees & Bites"),
    ("DB WHITE ALMOND", 80, "gm", "Dragees & Bites"),
    ("DB MILK CASHEW", 80, "gm", "Dragees & Bites"),
    ("DB CRAZY BALLS", 80, "gm", "Dragees & Bites"),
    ("DB RAISIN MILK", 90, "gm", "Dragees & Bites"),
    ("DB ASSORTED", 90, "gm", "Dragees & Bites"),
    ("DB BLUEBERRY", 80, "gm", "Dragees & Bites"),
    ("DB CRANBERRY", 80, "gm", "Dragees & Bites"),
    ("DB COFFEE SEEDS", 100, "gm", "Dragees & Bites"),
    ("DB MILK CHIPS", 100, "gm", "Dragees & Bites"),
    ("DB DARK CHIPS", 100, "gm", "Dragees & Bites"),
    ("DB WHITE CHIPS", 100, "gm", "Dragees & Bites"),
    ("DB NUTTIE BALLS", 100, "gm", "Dragees & Bites"),
    ("DB HAZELNUT BALLS", 80, "gm", "Dragees & Bites"),
    ("NUTTY POUCH", 250, "gm", "Dragees & Bites"),
    ("ASSORTED ALMOND POUCH", 250, "gm", "Dragees & Bites"),
    ("HAZELNUT POUCH", 200, "gm", "Dragees & Bites"),
    ("MILK RAISINS POUCH", 250, "gm", "Dragees & Bites"),
    ("PAN RAISINS POUCH", 250, "gm", "Dragees & Bites"),
    ("DARK ALMOND ROCKS", 120, "gm", "Dragees & Bites"),
    ("MILK ALMOND ROCKS", 120, "gm", "Dragees & Bites"),
    ("CRAZY BALLS", 150, "gm", "Dragees & Bites"),
    ("MARSHMALLOW SMALL", 70, "gm", "Dragees & Bites"),
    ("MARSHMALLOW BIG", 200, "gm", "Dragees & Bites"),

    # Lollipops & Singles
    ("LOLLY POP WHITE", 1, "pcs", "Specialty & Kunafa"),
    ("LOLLY POP DARK", 1, "pcs", "Specialty & Kunafa"),
    ("LOLLY POP MILK", 1, "pcs", "Specialty & Kunafa"),
    ("PHOTO LOLLY POP", 1, "pcs", "Specialty & Kunafa"),
    ("SINGLE HEART LOLLY POP", 30, "gm", "Specialty & Kunafa"),
    ("3 HEART LOLLY POP", 35, "gm", "Specialty & Kunafa"),
    ("HEART LOLLY POP", 25, "gm", "Specialty & Kunafa"),
    ("VALENTINE HEART", 60, "gm", "Specialty & Kunafa"),
    ("VALENTINE LIPS", 60, "gm", "Specialty & Kunafa"),
    ("RED HEART TWINS", 45, "gm", "Specialty & Kunafa"),

    # Gift Boxes & Hampers
    ("TWINNER PACK", 30, "gm", "Gift Boxes & Hampers"),
    ("FISH PACK", 35, "gm", "Gift Boxes & Hampers"),
    ("CAR PACK", 30, "gm", "Gift Boxes & Hampers"),
    ("CHOCOLATE HUT", 350, "gm", "Gift Boxes & Hampers"),
    ("CHOCOLATE TAJ MAHAL", 450, "gm", "Gift Boxes & Hampers"),
    ("JUMBO JOY ASSORTED", 1000, "gm", "Gift Boxes & Hampers"),
    ("JUMBO JOY 500", 500, "gm", "Gift Boxes & Hampers"),
    ("JUMBO JOY DARK ALMOND 1KG", 1000, "gm", "Gift Boxes & Hampers"),
    ("JUMBO JOY DARK ALMOND 500", 500, "gm", "Gift Boxes & Hampers"),
    ("JUMBO JOY MILK ALMOND 1KG", 1000, "gm", "Gift Boxes & Hampers"),
    ("JUMBO JOY MILK ALMOND 500", 500, "gm", "Gift Boxes & Hampers"),
    ("FEEL MY LOVE 1", 10, "gm", "Gift Boxes & Hampers"),
    ("FEEL MY LOVE 3 IN 1", 30, "gm", "Gift Boxes & Hampers"),
    ("FEEL MY LOVE 6 IN 1", 60, "gm", "Gift Boxes & Hampers"),
    ("BOUQUET 14PC", 140, "gm", "Gift Boxes & Hampers"),
    ("BOUQUET 25PC", 250, "gm", "Gift Boxes & Hampers"),
    ("BOUQUET HAND SPL", 140, "gm", "Gift Boxes & Hampers"),
    ("TWIST ASSORTED CHOCOLATES", 1, "pcs", "Gift Boxes & Hampers"),
    ("PARTY PACK", 1000, "gm", "Gift Boxes & Hampers"),
    ("SWEET HEART BOX", 100, "gm", "Gift Boxes & Hampers"),
    ("BABY BALLOON BIG", 100, "gm", "Gift Boxes & Hampers"),
    ("BABY BALLOON SMALL", 100, "gm", "Gift Boxes & Hampers"),
    ("CONE BIG", 100, "gm", "Gift Boxes & Hampers"),
    ("KAREENA TWIST", 100, "gm", "Gift Boxes & Hampers"),
    ("LOVE WAVE BOX", 80, "gm", "Gift Boxes & Hampers"),
    ("SIXCER FLOWER BIG", 100, "gm", "Gift Boxes & Hampers"),
    ("SIXCER FLOWER MED", 80, "gm", "Gift Boxes & Hampers"),
    ("SMS 1 LINE", 150, "gm", "Gift Boxes & Hampers"),
    ("SMS 2 LINE", 150, "gm", "Gift Boxes & Hampers"),
    ("SMS 3 LINE", 150, "gm", "Gift Boxes & Hampers"),
    ("T BAR BIG", 100, "gm", "Gift Boxes & Hampers"),
    ("ASSORTED ALMOND BOX", 120, "gm", "Gift Boxes & Hampers"),
    ("ALMOND TIN", 120, "gm", "Gift Boxes & Hampers"),
    ("FLORENTINE TIN", 240, "gm", "Gift Boxes & Hampers"),
    ("BRITTLE TIN", 120, "gm", "Gift Boxes & Hampers"),
    ("24 CVT BOX", 100, "gm", "Gift Boxes & Hampers"),
    ("12 CVT BOX", 100, "gm", "Gift Boxes & Hampers"),
    ("ITS A BOY ITS A GIRL PUTLI", 300, "gm", "Gift Boxes & Hampers"),
    ("24K GOLD ROSE", 1, "pcs", "Gift Boxes & Hampers"),
    ("DARLING HEART", 80, "gm", "Gift Boxes & Hampers"),
    ("GIFT HAMPER 800", 1, "pcs", "Gift Boxes & Hampers"),
    ("GIFT HAMPER 1250", 1, "pcs", "Gift Boxes & Hampers"),
    ("GIFT HAMPER 1800", 1, "pcs", "Gift Boxes & Hampers"),
    ("BALLS SMALL", 70, "gm", "Gift Boxes & Hampers"),
    ("BUTTERFLY BIG", 200, "gm", "Gift Boxes & Hampers"),
    ("LITTLE HEART", 120, "gm", "Gift Boxes & Hampers"),
    ("ROUND BOX", 250, "gm", "Gift Boxes & Hampers"),
    ("WHITE ALMOND 250GM", 250, "gm", "Gift Boxes & Hampers"),
    ("MILK ALMOND 250GM", 250, "gm", "Gift Boxes & Hampers"),
    ("DARK ALMOND 250GM", 250, "gm", "Gift Boxes & Hampers"),
    ("MILK BOTTLE", 30, "gm", "Gift Boxes & Hampers"),
    ("WAFER BOX", 1, "pcs", "Gift Boxes & Hampers"),
    ("CRAZY BAG", 130, "gm", "Gift Boxes & Hampers"),
    ("RUBY BOX SMALL", 200, "gm", "Gift Boxes & Hampers"),
    ("RUBY BOX BIG", 200, "gm", "Gift Boxes & Hampers"),
    ("DOUBLE HEART BOX", 200, "gm", "Gift Boxes & Hampers"),
    ("DELUXE BOX", 200, "gm", "Gift Boxes & Hampers"),
    ("TEDDY BOX SMALL", 150, "gm", "Gift Boxes & Hampers"),
    ("TEDDY BOX BIG", 500, "gm", "Gift Boxes & Hampers"),
    ("DIAMOND BUNCH", 150, "gm", "Gift Boxes & Hampers"),

    # Twist Collection
    ("TWIST PLAIN MILK", 1, "pcs", "Twist Collection"),
    ("TWIST BLUEBERRY", 1, "pcs", "Twist Collection"),
    ("TWIST BUTTERSCOTCH", 1, "pcs", "Twist Collection"),
    ("TWIST PLAIN DARK", 1, "pcs", "Twist Collection"),
    ("TWIST PLAIN WHITE", 1, "pcs", "Twist Collection"),
    ("TWIST SEA SALT", 1, "pcs", "Twist Collection"),
    ("TWIST ORANGE", 1, "pcs", "Twist Collection"),
    ("TWIST VANILLA", 1, "pcs", "Twist Collection"),
    ("TWIST CRISPY", 1, "pcs", "Twist Collection"),
    ("TWIST MANGO", 1, "pcs", "Twist Collection"),
    ("TWIST RAISINS", 1, "pcs", "Twist Collection"),
    ("TWIST BUBBLEGUM", 1, "pcs", "Twist Collection"),
    ("TWIST OREO", 1, "pcs", "Twist Collection"),
    ("TWIST BLACKCURRANT", 1, "pcs", "Twist Collection"),
    ("TWIST LEMON", 1, "pcs", "Twist Collection"),
    ("CHOCO BAG", 150, "gm", "Twist Collection"),
    ("BALL BUNCH", 1, "pcs", "Twist Collection"),

    # Bulk & Fountain
    ("FOUNTAIN CHOCOLATE 2KG", 2000, "gm", "Bulk & Fountain"),
    ("CAKE BOX 100PCS", 100, "pcs", "Bulk & Fountain"),
    ("BROWNIE BOX 50PCS", 50, "pcs", "Bulk & Fountain"),
    ("MM STICK DABBA 50PCS", 50, "pcs", "Bulk & Fountain"),
    ("JUJUBI DABBA 75PCS", 75, "pcs", "Bulk & Fountain"),
]

print(f"Total items to upload: {len(ITEMS)}")

# Get first available category as fallback
fallback_cat = list(cat_ids.values())[0] if cat_ids else None

uploaded = 0
failed = 0
item_ids = {}  # title → id

for title, weight, unit, cat_name in ITEMS:
    cid = cat_ids.get(cat_name, fallback_cat)
    if not cid:
        print(f"  SKIP {title}: no category")
        failed += 1
        continue

    small_unit = "gm" if unit == "gm" else ("ml" if unit == "ml" else "pcs")
    # Set min_qty_alert: random between 5-50 for variety (some will trigger low-stock)
    min_alert = random.choice([5, 10, 15, 20, 30, 50])
    min_unit = small_unit

    payload = {
        "items": {
            "category_id": cid,
            "stock_title": title,
            "unit": unit if unit != "gm" else "kg",  # Store in kg if gm items
            "small_unit": small_unit,
            "min_qty_alert": min_alert,
            "min_unit_alert": min_unit,
        }
    }

    # Use pcs/pcs for piece items
    if unit == "pcs":
        payload["items"]["unit"] = "pcs"
        payload["items"]["small_unit"] = "pcs"
        payload["items"]["min_unit_alert"] = "pcs"

    r = requests.post(f"{BASE}/proxy/v2/inventory/add-inventory", json=payload, headers=HEADERS)
    d = r.json()
    if d.get("success"):
        uploaded += 1
    else:
        print(f"  WARN {title}: {str(d)[:100]}")
        failed += 1

    if uploaded % 20 == 0:
        print(f"  Progress: {uploaded} uploaded, {failed} failed")

print(f"\n  DONE: {uploaded} uploaded, {failed} failed")

# Fetch all inventory items to get IDs
print("\n=== Fetching inventory item IDs ===")
r = requests.get(f"{BASE}/proxy/v2/inventory/get-inventory-master", headers=HEADERS)
all_items = r.json().get("data", r.json()) if isinstance(r.json(), dict) else r.json()
if isinstance(all_items, list):
    for item in all_items:
        item_ids[item["stock_title"]] = item["id"]
    print(f"  Total items in master: {len(all_items)}")
else:
    print(f"  WARN: unexpected response: {str(all_items)[:200]}")

# ── Step 3: Seed stock with batches and expiry dates ─────────────
print("\n=== Step 3: Seed Stock (Batches + Expiry) ===")

today = datetime.now()
vendors_r = requests.get(f"{BASE}/proxy/v2/inventory/get-vendor", headers=HEADERS)
vendors = vendors_r.json() if isinstance(vendors_r.json(), list) else vendors_r.json().get("data", [])
vendor_id = vendors[0]["id"] if vendors else 16

stock_seeded = 0
# Seed stock for first 40 items with various batch/expiry scenarios
sample_items = list(item_ids.items())[:40]

for i, (title, inv_id) in enumerate(sample_items):
    # Determine batch scenario
    if i < 10:
        # Good stock: 6 months expiry, decent quantity
        batch = f"BATCH-{title[:8].replace(' ','-')}-A"
        expiry = (today + timedelta(days=180)).strftime("%Y-%m-%d")
        qty = random.randint(20, 100)
    elif i < 20:
        # Near expiry: 5-15 days left
        batch = f"BATCH-{title[:8].replace(' ','-')}-NEAR"
        days_left = random.randint(5, 15)
        expiry = (today + timedelta(days=days_left)).strftime("%Y-%m-%d")
        qty = random.randint(5, 30)
    elif i < 28:
        # Expired: 1-10 days ago
        batch = f"BATCH-{title[:8].replace(' ','-')}-EXP"
        days_ago = random.randint(1, 10)
        expiry = (today - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        qty = random.randint(2, 15)
    elif i < 35:
        # Low stock: quantity below min threshold
        batch = f"BATCH-{title[:8].replace(' ','-')}-LOW"
        expiry = (today + timedelta(days=90)).strftime("%Y-%m-%d")
        qty = random.randint(1, 3)  # Will be below most min_qty_alerts
    else:
        # Out of stock scenario: very small qty
        batch = f"BATCH-{title[:8].replace(' ','-')}-OUT"
        expiry = (today + timedelta(days=60)).strftime("%Y-%m-%d")
        qty = 0  # Actually, we'll add 1 and then wastage it

    if qty <= 0:
        qty = 1  # Can't add 0 stock

    payload = {
        "quantity": qty,
        "unit": "pcs" if "pcs" in str(all_items[i]["unit"] if i < len(all_items) else "gm") else "kg",
        "vendor_id": vendor_id,
        "batch": batch,
        "expiry_date": expiry,
    }

    r = requests.post(f"{BASE}/proxy/v2/inventory/add-stock/{inv_id}", json=payload, headers=HEADERS)
    d = r.json()
    if r.status_code < 400:
        stock_seeded += 1
    else:
        print(f"  WARN add-stock {title}: {str(d)[:100]}")

    if stock_seeded % 10 == 0 and stock_seeded > 0:
        print(f"  Progress: {stock_seeded} stock entries seeded")

print(f"\n  DONE: {stock_seeded} stock entries seeded")

# ── Step 4: Seed transfers ───────────────────────────────────────
print("\n=== Step 4: Seed Transfers ===")

# Get first 5 item IDs for transfers
transfer_items = list(item_ids.items())[:5]

if len(transfer_items) >= 3:
    # Dispatch from Central (rid=1) to DemoCentral1 (rid=781): 3 items
    dispatch_payload = {
        "from_restaurant_id": 1,
        "to_restaurant_id": 781,
        "items": []
    }
    for title, inv_id in transfer_items[:3]:
        # Need source selector - get segments
        sr = requests.post(f"{BASE}/proxy/v2/inventory-transfer/source-options",
                          json={"source_inventory_master_id": inv_id, "from_restaurant_id": 1}, headers=HEADERS)
        segs = sr.json().get("data", {}).get("segments", [])
        if segs:
            seg = segs[0]
            dispatch_payload["items"].append({
                "source_inventory_master_id": inv_id,
                "quantity": min(5, float(seg.get("display_qty", 5))),
                "unit": "kg",
                "source_selector": {"mode": "segment_id", "segment_id": seg["segment_id"]}
            })

    if dispatch_payload["items"]:
        r = requests.post(f"{BASE}/proxy/v2/inventory-transfer/initiate", json=dispatch_payload, headers=HEADERS)
        d = r.json()
        tid = (d.get("data") or {}).get("transfer_id") if isinstance(d.get("data"), dict) else None
        print(f"  Dispatch Central→DemoCentral1: transfer_id={tid}, status={r.status_code}")

        # Also dispatch to DemoFranchise1 (rid=783)
        dispatch2 = {
            "from_restaurant_id": 1,
            "to_restaurant_id": 783,
            "items": dispatch_payload["items"][:2]  # 2 items
        }
        r2 = requests.post(f"{BASE}/proxy/v2/inventory-transfer/initiate", json=dispatch2, headers=HEADERS)
        d2 = r2.json()
        tid2 = (d2.get("data") or {}).get("transfer_id") if isinstance(d2.get("data"), dict) else None
        print(f"  Dispatch Central→DemoFranchise1: transfer_id={tid2}, status={r2.status_code}")

# ── Step 5: Seed wastage ─────────────────────────────────────────
print("\n=== Step 5: Seed Wastage ===")

wastage_items = list(item_ids.items())[5:10]
wastage_count = 0

for title, inv_id in wastage_items:
    sr = requests.post(f"{BASE}/proxy/v2/inventory-transfer/source-options",
                      json={"source_inventory_master_id": inv_id, "from_restaurant_id": 1}, headers=HEADERS)
    segs = sr.json().get("data", {}).get("segments", [])
    if segs:
        seg = segs[0]
        avail = float(seg.get("display_qty", 0))
        if avail > 1:
            waste_qty = min(2, avail - 0.5)
            payload = {
                "source_inventory_master_id": inv_id,
                "quantity": waste_qty,
                "unit": "kg",
                "source_selector": {"mode": "segment_id", "segment_id": seg["segment_id"]},
                "reason": random.choice(["Expired", "Damaged in transit", "Quality issue", "Melted"]),
                "restaurant_id": 1,
            }
            r = requests.post(f"{BASE}/proxy/v2/inventory-transfer/record-wastage", json=payload, headers=HEADERS)
            if r.status_code < 400:
                wastage_count += 1
            else:
                print(f"  WARN wastage {title}: {r.json()}")

print(f"  Wastage records created: {wastage_count}")

# ── Summary ──────────────────────────────────────────────────────
print("\n" + "="*60)
print("SEED COMPLETE")
print(f"  Categories created: {len(cat_ids)}")
print(f"  Inventory items uploaded: {uploaded}")
print(f"  Stock entries seeded: {stock_seeded}")
print(f"  Wastage records: {wastage_count}")
print(f"  Transfers initiated: 2")
print("="*60)
