#!/usr/bin/env python3
"""Phase 5.3: Create 19 sub-recipes with BOM from Excel data"""

import subprocess, json, time

API_URL = "https://c933daf8-92c2-4edb-a4dd-0782f6409f84.preview.emergentagent.com"
TOKEN = json.loads(subprocess.run(
    ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/auth/login",
     "-H", "Content-Type: application/json",
     "-d", json.dumps({"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})],
    capture_output=True, text=True
).stdout)["token"]

# Inventory Master IDs
INV = {
    "Ajwain": 17815, "Almonds": 17783, "Baking Powder": 17780, "Baking Soda": 17781,
    "Carrot": 17797, "Cashew": 17784, "Chilli Powder": 17789, "Choco Chips": 17795,
    "Coconut Powder": 17794, "Coriander Leaves": 17801, "Curry Leaves": 17800,
    "Dates": 17792, "Egg Replacer": 17782, "Elachi Powder": 17814, "GSM": 17777,
    "Garlic": 17803, "Green Chilli": 17798, "Icing Sugar": 17778,
    "Jaggery Powder": 17810, "Jeera": 17788, "Jowar Flour": 17774,
    "Kasuri Methi": 17802, "Lilly Margarine": 17806, "Maida": 17775,
    "Milk": 17808, "Mint": 17799, "Nutrelite Butter": 17807, "Oats": 17793,
    "Oil": 17809, "Peanuts": 17785, "Pumpkin Seeds": 17812, "Ragi Flour": 17773,
    "Raisins": 17791, "Rice Flour": 17776, "Salt": 17790, "Sugar": 17779,
    "Sunflower Seeds": 17811, "Vanilla Essence": 17813, "Wheat Bran": 17796,
    "White Sesame": 17786, "White Till Powder": 17787, "Whole Wheat Flour": 17772,
}

# All 19 recipes: (name, output_qty, unit, [(ingredient_name, qty_gm, unit)])
# Quantities converted: Excel gm → kg (divide by 1000), ml → ltr (divide by 1000)
RECIPES = [
    ("Sesame Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.065, "kg"), ("GSM", 0.030, "kg"), ("Whole Wheat Flour", 0.045, "kg"),
        ("Baking Soda", 0.001, "kg"), ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.001, "ltr"),
        ("White Till Powder", 0.020, "kg"), ("Oil", 0.005, "ltr"), ("White Sesame", 0.030, "kg"),
    ]),
    ("Cashew Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.030, "kg"), ("GSM", 0.015, "kg"), ("Whole Wheat Flour", 0.060, "kg"),
        ("Baking Powder", 0.002, "kg"), ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.001, "ltr"),
        ("Cashew", 0.035, "kg"), ("Salt", 0.001, "kg"), ("Milk", 0.030, "ltr"),
    ]),
    ("Whole wheat Elachi Cookies With Jaggery", 28, "piece", [
        ("Jaggery Powder", 0.050, "kg"), ("GSM", 0.100, "kg"), ("Whole Wheat Flour", 0.120, "kg"),
        ("Baking Powder", 0.005, "kg"), ("Baking Soda", 0.003, "kg"), ("Elachi Powder", 0.002, "kg"),
        ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.001, "ltr"), ("Milk", 0.005, "ltr"),
    ]),
    ("Coconut Cookies With Jaggery", 28, "piece", [
        ("Jaggery Powder", 0.060, "kg"), ("GSM", 0.050, "kg"), ("Whole Wheat Flour", 0.075, "kg"),
        ("Baking Powder", 0.003, "kg"), ("Baking Soda", 0.002, "kg"), ("Coconut Powder", 0.030, "kg"),
        ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.001, "ltr"),
    ]),
    ("Dates Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.045, "kg"), ("GSM", 0.040, "kg"), ("Whole Wheat Flour", 0.090, "kg"),
        ("Dates", 0.030, "kg"), ("Baking Powder", 0.002, "kg"), ("Milk", 0.015, "ltr"),
        ("Egg Replacer", 0.004, "kg"), ("Vanilla Essence", 0.001, "ltr"),
    ]),
    ("Ajwain Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.040, "kg"), ("GSM", 0.055, "kg"), ("Whole Wheat Flour", 0.060, "kg"),
        ("Rice Flour", 0.015, "kg"), ("Baking Powder", 0.002, "kg"), ("Egg Replacer", 0.004, "kg"),
        ("Vanilla Essence", 0.001, "ltr"), ("Ajwain", 0.003, "kg"),
    ]),
    ("Jeera Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.060, "kg"), ("GSM", 0.065, "kg"), ("Whole Wheat Flour", 0.120, "kg"),
        ("Baking Powder", 0.002, "kg"), ("Egg Replacer", 0.006, "kg"), ("Vanilla Essence", 0.001, "ltr"),
        ("Jeera", 0.005, "kg"), ("Salt", 0.001, "kg"), ("Milk", 0.020, "ltr"),
    ]),
    ("Almond Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.030, "kg"), ("GSM", 0.025, "kg"), ("Whole Wheat Flour", 0.060, "kg"),
        ("Baking Powder", 0.002, "kg"), ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.001, "ltr"),
        ("Almonds", 0.036, "kg"), ("Salt", 0.001, "kg"), ("Milk", 0.020, "ltr"),
    ]),
    ("Ragi Cookies With Jaggery", 21, "piece", [
        ("Ragi Flour", 0.060, "kg"), ("GSM", 0.110, "kg"), ("Whole Wheat Flour", 0.060, "kg"),
        ("Jaggery Powder", 0.060, "kg"), ("Baking Powder", 0.002, "kg"), ("Egg Replacer", 0.004, "kg"),
        ("Vanilla Essence", 0.001, "ltr"), ("Elachi Powder", 0.002, "kg"),
    ]),
    ("Oats Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.065, "kg"), ("GSM", 0.035, "kg"), ("Whole Wheat Flour", 0.050, "kg"),
        ("Baking Soda", 0.002, "kg"), ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.001, "ltr"),
        ("Raisins", 0.015, "kg"), ("Oats", 0.060, "kg"), ("Salt", 0.001, "kg"), ("Milk", 0.005, "ltr"),
    ]),
    ("Choco Chip Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.045, "kg"), ("GSM", 0.028, "kg"), ("Whole Wheat Flour", 0.030, "kg"),
        ("Baking Soda", 0.004, "kg"), ("Egg Replacer", 0.004, "kg"), ("Vanilla Essence", 0.001, "ltr"),
        ("Choco Chips", 0.032, "kg"), ("Oats", 0.032, "kg"), ("Milk", 0.004, "ltr"),
    ]),
    ("Ragi Elachi Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.040, "kg"), ("GSM", 0.040, "kg"), ("Ragi Flour", 0.045, "kg"),
        ("Whole Wheat Flour", 0.015, "kg"), ("Baking Powder", 0.002, "kg"), ("Elachi Powder", 0.002, "kg"),
        ("Milk", 0.005, "ltr"), ("Egg Replacer", 0.004, "kg"), ("Vanilla Essence", 0.001, "ltr"),
    ]),
    ("Multi Millet Cashew Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.060, "kg"), ("GSM", 0.060, "kg"), ("Jowar Flour", 0.045, "kg"),
        ("Ragi Flour", 0.045, "kg"), ("Whole Wheat Flour", 0.015, "kg"), ("Baking Powder", 0.003, "kg"),
        ("Cashew", 0.010, "kg"), ("Milk", 0.015, "ltr"), ("Egg Replacer", 0.004, "kg"),
        ("Vanilla Essence", 0.001, "ltr"),
    ]),
    ("Multiseed Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.100, "kg"), ("GSM", 0.058, "kg"), ("Whole Wheat Flour", 0.073, "kg"),
        ("Baking Soda", 0.002, "kg"), ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.002, "ltr"),
        ("Salt", 0.001, "kg"), ("Sunflower Seeds", 0.015, "kg"), ("Cashew", 0.015, "kg"),
        ("Peanuts", 0.015, "kg"), ("Almonds", 0.015, "kg"), ("White Sesame", 0.015, "kg"),
        ("Pumpkin Seeds", 0.015, "kg"), ("Milk", 0.005, "ltr"),
    ]),
    ("Carrot Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.050, "kg"), ("GSM", 0.057, "kg"), ("Whole Wheat Flour", 0.050, "kg"),
        ("Baking Soda", 0.002, "kg"), ("Egg Replacer", 0.002, "kg"), ("Vanilla Essence", 0.001, "ltr"),
        ("Raisins", 0.030, "kg"), ("Oats", 0.045, "kg"), ("Salt", 0.001, "kg"),
        ("Carrot", 0.010, "kg"), ("Coconut Powder", 0.015, "kg"),
    ]),
    ("Wheat Bran Cookies With Jaggery", 21, "piece", [
        ("Jaggery Powder", 0.050, "kg"), ("GSM", 0.050, "kg"), ("Whole Wheat Flour", 0.065, "kg"),
        ("Baking Powder", 0.003, "kg"), ("Wheat Bran", 0.015, "kg"), ("Milk", 0.015, "ltr"),
        ("Egg Replacer", 0.004, "kg"), ("Vanilla Essence", 0.001, "ltr"),
    ]),
    ("Sweet Masala Cookies With Sugar", 220, "piece", [
        ("GSM", 1.000, "kg"), ("Maida", 1.500, "kg"), ("Ajwain", 0.150, "kg"),
        ("Chilli Powder", 0.030, "kg"), ("Green Chilli", 0.100, "kg"), ("Icing Sugar", 0.500, "kg"),
        ("Salt", 0.040, "kg"), ("Egg Replacer", 0.030, "kg"), ("Mint", 0.100, "kg"),
        ("Curry Leaves", 0.100, "kg"), ("Coriander Leaves", 0.100, "kg"), ("Baking Powder", 0.020, "kg"),
    ]),
    ("Methi Khari", 100, "piece", [
        ("Maida", 3.500, "kg"), ("Salt", 0.060, "kg"), ("Sugar", 0.150, "kg"),
        ("GSM", 0.150, "kg"), ("Lilly Margarine", 1.450, "kg"), ("Ajwain", 0.035, "kg"),
        ("Jeera", 0.035, "kg"), ("Chilli Powder", 0.045, "kg"), ("Kasuri Methi", 0.050, "kg"),
    ]),
    ("Garlic Khari", 100, "piece", [
        ("Maida", 3.500, "kg"), ("Salt", 0.060, "kg"), ("Sugar", 0.150, "kg"),
        ("GSM", 0.150, "kg"), ("Lilly Margarine", 1.450, "kg"), ("Nutrelite Butter", 0.300, "kg"),
        ("Garlic", 0.450, "kg"),
    ]),
]

print(f"Creating {len(RECIPES)} sub-recipes...\n")
created = 0

for name, output_qty, unit, ingredients in RECIPES:
    # Build ingredients array
    ing_list = []
    for ing_name, qty, ing_unit in ingredients:
        inv_id = INV.get(ing_name)
        if not inv_id:
            print(f"  WARNING: No inventory ID for '{ing_name}' in recipe '{name}'")
            continue
        ing_list.append({
            "inventory_master_id": inv_id,
            "quantity": qty,
            "unit": ing_unit,
        })
    
    payload = {
        "name": name,
        "output_quantity": output_qty,
        "output_unit": unit,
        "ingredients": ing_list,
    }
    
    resp = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{API_URL}/api/proxy/v2/recipe/store-sub-recipe",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-d", json.dumps(payload)],
        capture_output=True, text=True
    )
    
    try:
        d = json.loads(resp.stdout)
        sr_id = d.get("sub_recipe", {}).get("id") or d.get("data", {}).get("id") or d.get("id")
        if sr_id:
            print(f"  ✓ {name:<48} → SubRecipe ID={sr_id} ({len(ing_list)} ingredients)")
            created += 1
        elif d.get("success") == False:
            print(f"  ✗ {name:<48} FAIL: {json.dumps(d)[:150]}")
        else:
            # Maybe success without explicit ID
            print(f"  ? {name:<48} Response: {json.dumps(d)[:200]}")
            created += 1
    except Exception as e:
        print(f"  ✗ {name:<48} ERROR: {e} | {resp.stdout[:150]}")
    
    time.sleep(0.5)

print(f"\nTotal: {created}/{len(RECIPES)} sub-recipes created")
