#!/usr/bin/env python3
"""Phase 5.3: Create all 19 sub-recipes for chai (813) hierarchy.
Recipe 1 (Sesame Cookies) already created as ID=206. Creates recipes 2-19."""

import requests, json, sys, os, time

API_URL = os.environ.get("API_URL", "").rstrip("/")
if not API_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                API_URL = line.strip().split("=", 1)[1]

# Login as chai Central
r = requests.post(f"{API_URL}/api/proxy/auth/login",
    json={"email": "owner@chai.com", "password": "Qplazm@10", "fcm_token": "central_inventory_web"})
token = r.json().get("token")
if not token:
    print("FATAL: Login failed"); sys.exit(1)
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

RECIPES = [
    # (name, food_id, qty, ingredients: [(inv_id, qty, unit), ...])
    # Recipe 1 already created
    ("Cashew Cookies With Jaggery", 206276, 21, [
        (17810,30,"gm"),(17777,15,"gm"),(17772,60,"gm"),(17780,2,"gm"),
        (17782,2,"gm"),(17813,1,"ml"),(17784,35,"gm"),(17790,1,"gm"),(17808,30,"ml")]),
    ("Whole wheat Elachi Cookies With Jaggery", 206277, 28, [
        (17810,50,"gm"),(17777,100,"gm"),(17772,120,"gm"),(17780,5,"gm"),
        (17781,3,"gm"),(17814,2,"gm"),(17782,2,"gm"),(17813,1,"ml"),(17808,5,"ml")]),
    ("Coconut Cookies With Jaggery", 206278, 28, [
        (17810,60,"gm"),(17777,50,"gm"),(17772,75,"gm"),(17780,3,"gm"),
        (17781,2,"gm"),(17794,30,"gm"),(17782,2,"gm"),(17813,1,"ml")]),
    ("Dates Cookies With Jaggery", 206279, 21, [
        (17810,45,"gm"),(17777,40,"gm"),(17772,90,"gm"),(17792,30,"gm"),
        (17780,2,"gm"),(17808,15,"ml"),(17782,4,"gm"),(17813,1,"ml")]),
    ("Ajwain Cookies With Jaggery", 206280, 21, [
        (17810,40,"gm"),(17777,55,"gm"),(17772,60,"gm"),(17776,15,"gm"),
        (17780,2,"gm"),(17782,4,"gm"),(17813,1,"ml"),(17815,3,"gm")]),
    ("Jeera Cookies With Jaggery", 206281, 21, [
        (17810,60,"gm"),(17777,65,"gm"),(17772,120,"gm"),(17780,2,"gm"),
        (17782,6,"gm"),(17813,1,"ml"),(17788,5,"gm"),(17790,1,"gm"),(17808,20,"ml")]),
    ("Almond Cookies With Jaggery", 206282, 21, [
        (17810,30,"gm"),(17777,25,"gm"),(17772,60,"gm"),(17780,2,"gm"),
        (17782,2,"gm"),(17813,1,"ml"),(17783,36,"gm"),(17790,1,"gm"),(17808,20,"ml")]),
    ("Ragi Cookies With Jaggery", 206283, 21, [
        (17773,60,"gm"),(17777,110,"gm"),(17772,60,"gm"),(17810,60,"gm"),
        (17780,2,"gm"),(17782,4,"gm"),(17813,1,"ml"),(17814,2,"gm")]),
    ("Oats Cookies With Jaggery", 206284, 21, [
        (17810,65,"gm"),(17777,35,"gm"),(17772,50,"gm"),(17781,2,"gm"),
        (17782,2,"gm"),(17813,1,"ml"),(17791,15,"gm"),(17793,60,"gm"),
        (17790,1,"gm"),(17808,5,"ml")]),
    ("Choco Chip Cookies With Jaggery", 206285, 21, [
        (17810,45,"gm"),(17777,28,"gm"),(17772,30,"gm"),(17781,4,"gm"),
        (17782,4,"gm"),(17813,1,"ml"),(17795,32,"gm"),(17793,32,"gm"),(17808,4,"ml")]),
    ("Ragi Elachi Cookies With Jaggery", 206286, 21, [
        (17810,40,"gm"),(17777,40,"gm"),(17773,45,"gm"),(17772,15,"gm"),
        (17780,2,"gm"),(17814,2,"gm"),(17808,5,"ml"),(17782,4,"gm"),(17813,1,"ml")]),
    ("Multi Millet Cashew Cookies With Jaggery", 206287, 21, [
        (17810,60,"gm"),(17777,60,"gm"),(17774,45,"gm"),(17773,45,"gm"),
        (17772,15,"gm"),(17780,3,"gm"),(17784,10,"gm"),(17808,15,"ml"),
        (17782,4,"gm"),(17813,1,"ml")]),
    ("Multiseed Cookies With Jaggery", 206288, 21, [
        (17810,100,"gm"),(17777,58,"gm"),(17772,73,"gm"),(17781,2,"gm"),
        (17782,2,"gm"),(17813,2,"ml"),(17790,1,"gm"),(17811,15,"gm"),
        (17784,15,"gm"),(17785,15,"gm"),(17783,15,"gm"),(17786,15,"gm"),
        (17812,15,"gm"),(17808,5,"ml")]),
    ("Carrot Cookies With Jaggery", 206289, 21, [
        (17810,50,"gm"),(17777,57,"gm"),(17772,50,"gm"),(17781,2,"gm"),
        (17782,2,"gm"),(17813,1,"ml"),(17791,30,"gm"),(17793,45,"gm"),
        (17790,1,"gm"),(17797,10,"gm"),(17794,15,"gm")]),
    ("Wheat Bran Cookies With Jaggery", 206290, 21, [
        (17810,50,"gm"),(17777,50,"gm"),(17772,65,"gm"),(17780,3,"gm"),
        (17796,15,"gm"),(17808,15,"ml"),(17782,4,"gm"),(17813,1,"ml")]),
    ("Sweet Masala Cookies With Sugar", 206291, 220, [
        (17777,1000,"gm"),(17775,1500,"gm"),(17815,150,"gm"),(17789,30,"gm"),
        (17798,100,"gm"),(17778,500,"gm"),(17790,40,"gm"),(17782,30,"gm"),
        (17799,100,"gm"),(17800,100,"gm"),(17801,100,"gm"),(17780,20,"gm")]),
    ("Methi Khari", 206292, 100, [
        (17775,3500,"gm"),(17790,60,"gm"),(17779,150,"gm"),(17777,150,"gm"),
        (17806,1450,"gm"),(17815,35,"gm"),(17788,35,"gm"),(17789,45,"gm"),
        (17802,50,"gm")]),
    ("Garlic Khari", 206293, 100, [
        (17775,3500,"gm"),(17790,60,"gm"),(17779,150,"gm"),(17777,150,"gm"),
        (17806,1450,"gm"),(17807,300,"gm"),(17803,450,"gm")]),
]

created = {}
failed = []

for i, (name, food_id, qty, ings) in enumerate(RECIPES, start=2):
    payload = {
        "sub_recipe_name": name,
        "food_name": name,
        "prepration_time": 0,
        "serve_people": 1,
        "subunit": "piece",
        "qty": qty,
        "ingredient": [{"id": inv_id, "qty": q, "unit": u} for inv_id, q, u in ings],
    }
    r = requests.post(f"{API_URL}/api/proxy/v2/recipe/store-sub-recipe",
                      headers=headers, json=payload)
    d = r.json()
    if "exception" in d or "errors" in d:
        print(f"  FAIL Recipe {i}: {name} — {d.get('message','')[:150]}")
        failed.append((i, name, d.get("message","")))
    else:
        print(f"  OK   Recipe {i}: {name} (qty={qty})")
        created[name] = d

    time.sleep(0.3)  # rate limit courtesy

print(f"\n=== SUMMARY ===")
print(f"Created: {len(created)}/18")
print(f"Failed: {len(failed)}")
if failed:
    for i, name, msg in failed:
        print(f"  FAIL {i}: {name} — {msg[:100]}")
