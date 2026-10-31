#!/usr/bin/env python3
"""Phase 5.4: Link recipes to foods for chai (813).
Uses CR-034 correct fields: name=food_id (integer), preparation_time, serves_people, {id,qty,unit}."""

import requests, json, sys, time

with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            API_URL = line.strip().split("=", 1)[1]

r = requests.post(f"{API_URL}/api/proxy/auth/login",
    json={"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
token = r.json()["token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Get sub-recipes to build the ingredient mapping
sr_resp = requests.get(f"{API_URL}/api/proxy/v2/recipe/sub-recipes", headers=headers)
sub_recipes = sr_resp.json().get("sub_recipes", [])
sr_by_name = {sr["name"]: sr for sr in sub_recipes}

# Food ID → Sub-recipe name mapping (from seed plan)
FOOD_SR_MAP = [
    (206275, "Sesame Cookies With Jaggery"),
    (206276, "Cashew Cookies With Jaggery"),
    (206277, "Whole wheat Elachi Cookies With Jaggery"),
    (206278, "Coconut Cookies With Jaggery"),
    (206279, "Dates Cookies With Jaggery"),
    (206280, "Ajwain Cookies With Jaggery"),
    (206281, "Jeera Cookies With Jaggery"),
    (206282, "Almond Cookies With Jaggery"),
    (206283, "Ragi Cookies With Jaggery"),
    (206284, "Oats Cookies With Jaggery"),
    (206285, "Choco Chip Cookies With Jaggery"),
    (206286, "Ragi Elachi Cookies With Jaggery"),
    (206287, "Multi Millet Cashew Cookies With Jaggery"),
    (206288, "Multiseed Cookies With Jaggery"),
    (206289, "Carrot Cookies With Jaggery"),
    (206290, "Wheat Bran Cookies With Jaggery"),
    (206291, "Sweet Masala Cookies With Sugar"),
    (206292, "Methi Khari"),
    (206293, "Garlic Khari"),
]

created = 0
failed = []

for food_id, sr_name in FOOD_SR_MAP:
    sr = sr_by_name.get(sr_name)
    if not sr:
        print(f"  SKIP {sr_name} — sub-recipe not found")
        failed.append((food_id, sr_name, "sub-recipe not found"))
        continue

    # Build ingredients from sub-recipe's BOM using {id, qty, unit} format
    ings = [{"id": i["ingredient_id"], "qty": i["ingredient_qty"], "unit": i["ingredient_unit"]}
            for i in sr.get("ingredients", [])]

    payload = {
        "name": food_id,  # CR-034: name = food_id (integer)
        "food_id": food_id,
        "food_name": sr_name,
        "preparation_time": 0,
        "serves_people": 1,
        "serve_time": 0,
        "qty": int(float(sr["qty"])),
        "unit": "piece",
        "ingredients": ings,
    }

    r = requests.post(f"{API_URL}/api/proxy/v2/recipe/store-recipe", headers=headers, json=payload)
    d = r.json()

    if "exception" in d or ("errors" in d and d.get("message") != ""):
        msg = d.get("message", "") or json.dumps(d.get("errors", {}))
        print(f"  FAIL {sr_name} (food={food_id}) — {msg[:150]}")
        failed.append((food_id, sr_name, msg))
    else:
        rid = d.get("recipe_id", "?")
        print(f"  OK   {sr_name} → recipe_id={rid}")
        created += 1

    time.sleep(0.3)

print(f"\n=== SUMMARY ===")
print(f"Linked: {created}/19")
print(f"Failed: {len(failed)}")
for fid, name, msg in failed:
    print(f"  FAIL food={fid}: {name} — {msg[:100]}")
