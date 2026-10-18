#!/usr/bin/env python3
"""Phase 8: Run production for all 19 sub-recipes for chai (813)."""

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

EXPIRY = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
BATCH_DATE = datetime.now().strftime("%Y%m%d")

# Get sub-recipes
sr_resp = requests.get(f"{API_URL}/api/proxy/v2/recipe/sub-recipes", headers=H)
sub_recipes = sr_resp.json().get("sub_recipes", [])

print(f"=== Phase 8: Production Runs ({len(sub_recipes)} sub-recipes) ===\n")

# Batch multipliers — cookies get 3x, kharis/masala get 2x
MULTIPLIERS = {
    "Sweet Masala Cookies With Sugar": 2,
    "Methi Khari": 2,
    "Garlic Khari": 2,
}

success = 0
failed = []

for i, sr in enumerate(sub_recipes):
    name = sr["name"]
    sr_id = sr["recipe_id"]
    multiplier = MULTIPLIERS.get(name, 3)
    batch_code = f"{name.replace(' ', '-')[:20]}-{BATCH_DATE}-{i+1:03d}"

    payload = {
        "sub_recipe_id": sr_id,
        "quantity": multiplier,
        "unit": "piece",
        "batch": batch_code,
        "expiry_date": EXPIRY,
    }
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory/production-run/complete", headers=H, json=payload)
    d = r.json()

    if d.get("status") == False or "exception" in d:
        errors = d.get("errors", [])
        if isinstance(errors, list) and errors:
            msg = errors[0].get("message", str(errors[0]))
        elif isinstance(errors, dict):
            msg = str(list(errors.values())[:2])
        else:
            msg = d.get("message", json.dumps(d)[:150])
        print(f"  FAIL {name} (sr={sr_id}, x{multiplier}): {msg}")
        failed.append((name, msg))
    else:
        run_id = d.get("data", {}).get("production_run_id", d.get("production_run_id", "?"))
        print(f"  OK   {name} x{multiplier} → run={run_id}")
        success += 1

    time.sleep(0.3)

print(f"\n=== PHASE 8 SUMMARY ===")
print(f"Produced: {success}/{len(sub_recipes)}")
if failed:
    print(f"Failed: {len(failed)}")
    for name, msg in failed:
        print(f"  {name}: {msg}")
