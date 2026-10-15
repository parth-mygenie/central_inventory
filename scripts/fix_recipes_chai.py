#!/usr/bin/env python3
"""
Fix recipes for Chai (813): Delete all 19 recipes with raw ingredients,
re-create each with 1 ingredient pointing to its matching sub-recipe inventory_id.

Before: Food → Recipe (9 raw ingredients)
After:  Food → Recipe (1 sub-recipe reference)
"""

import requests, json, sys, time

with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]

r = requests.post(f"{API_URL}/api/proxy/auth/login",
    json={"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
token = r.json()["token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ── Build name→IDs mapping ──
# Get sub-recipes: name → inventory_id
sr_resp = requests.get(f"{API_URL}/api/proxy/v2/recipe/sub-recipes", headers=H).json()
sub_recipes = sr_resp.get("sub_recipes", [])
# Filter to only chai 19 (exclude TEST_ entries)
sr_by_name = {}
for sr in sub_recipes:
    if not sr["name"].startswith("TEST_"):
        sr_by_name[sr["name"]] = {"inventory_id": sr["inventory_id"], "recipe_id": sr["recipe_id"], "qty": sr["qty"]}

# Get foods: name → food_id
foods_resp = requests.get(f"{API_URL}/api/proxy/v2/product/foods-list", headers=H).json()
food_by_name = {f["name"]: f["id"] for f in foods_resp.get("foods", [])}

# Get current recipes to delete
recipes_resp = requests.get(f"{API_URL}/api/proxy/v2/recipe/get-recipe", headers=H).json()
current_recipes = recipes_resp.get("recipes", [])

print(f"Current recipes: {len(current_recipes)}")
print(f"Sub-recipes (chai): {len(sr_by_name)}")
print(f"Foods: {len(food_by_name)}")
print()

# ── STEP 1: Delete all 19 existing recipes ──
print("=== STEP 1: Delete existing recipes ===")
deleted = 0
for recipe in current_recipes:
    rid = recipe["recipe_id"]
    name = recipe["name"]
    resp = requests.delete(f"{API_URL}/api/proxy/v2/recipe/delete-recipe/{rid}",
        headers=H, json={"reason": "Correcting recipe to use sub-recipe reference instead of raw ingredients"})
    d = resp.json()
    if d.get("status") == True or "deleted" in str(d).lower():
        print(f"  Deleted recipe {rid}: {name}")
        deleted += 1
    else:
        print(f"  FAIL delete {rid}: {d.get('message', json.dumps(d)[:150])}")
    time.sleep(0.3)

print(f"\nDeleted: {deleted}/{len(current_recipes)}")

if deleted != len(current_recipes):
    print("WARNING: Not all recipes deleted. Stopping.")
    sys.exit(1)

print()

# ── STEP 2: Re-create 19 recipes with 1 sub-recipe ingredient each ──
print("=== STEP 2: Create corrected recipes ===")
created = 0
failed = []

for name, sr_info in sorted(sr_by_name.items()):
    food_id = food_by_name.get(name)
    if not food_id:
        print(f"  SKIP {name}: no matching food_id")
        failed.append((name, "no food_id"))
        continue
    
    sr_inv_id = sr_info["inventory_id"]
    sr_qty = int(float(sr_info["qty"]))
    
    # Recipe payload: name=food_id (integer), 1 ingredient = sub-recipe inventory_id
    payload = {
        "name": food_id,                    # CR-034: name = food_id (integer)
        "food_name": name,
        "food_id": food_id,
        "preparation_time": 0,              # CR-034: correct spelling
        "serves_people": 1,                 # CR-034: with 's'
        "serve_time": 0,
        "qty": sr_qty,
        "unit": "piece",
        "ingredients": [                    # 1 ingredient: the sub-recipe
            {"id": sr_inv_id, "qty": 1, "unit": "piece"}
        ],
    }
    
    resp = requests.post(f"{API_URL}/api/proxy/v2/recipe/store-recipe", headers=H, json=payload)
    d = resp.json()
    
    new_rid = d.get("recipe_id", d.get("data", {}).get("recipe_id", "?"))
    if new_rid and new_rid != "?" and "exception" not in d:
        print(f"  Created recipe {new_rid}: {name} → 1 ingredient (sub-recipe inv_id={sr_inv_id})")
        created += 1
    else:
        msg = d.get("message", json.dumps(d)[:200])
        print(f"  FAIL {name}: {msg}")
        failed.append((name, msg))
    
    time.sleep(0.3)

print(f"\n=== SUMMARY ===")
print(f"Deleted: {deleted}/19")
print(f"Created: {created}/19")
print(f"Failed: {len(failed)}")
for name, msg in failed:
    print(f"  {name}: {msg}")

# ── STEP 3: Verify ──
print(f"\n=== VERIFICATION ===")
verify_resp = requests.get(f"{API_URL}/api/proxy/v2/recipe/get-recipe", headers=H).json()
verify_recipes = verify_resp.get("recipes", [])
print(f"Recipes now: {len(verify_recipes)}")
all_correct = True
for r in verify_recipes:
    ings = r.get("ingredients", [])
    if len(ings) != 1:
        print(f"  WRONG: {r['name']} has {len(ings)} ingredients (expected 1)")
        all_correct = False
    else:
        print(f"  OK: {r['name']} → 1 ingredient (id={ings[0].get('ingredient_id', '?')})")

if all_correct and len(verify_recipes) == 19:
    print("\nAll 19 recipes corrected: each has exactly 1 sub-recipe ingredient.")
else:
    print(f"\nISSUE: Expected 19 recipes with 1 ingredient each.")
