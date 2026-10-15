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

# Get sub-recipes for IDs
sr_resp = requests.get(f"{API_URL}/api/proxy/v2/recipe/sub-recipes", headers=H)
sub_recipes = sr_resp.json().get("sub_recipes", [])

# Discover the production run API
# Try the endpoint from api.js
print(f"=== Phase 8: Production Runs ({len(sub_recipes)} sub-recipes) ===")

# First, test one to discover the API format
test_sr = sub_recipes[0]
print(f"\nTesting with: {test_sr['name']} (recipe_id={test_sr['recipe_id']}, inv_id={test_sr.get('inventory_id')})")

# Try production-run/complete endpoint
payload = {
    "sub_recipe_id": test_sr["recipe_id"],
    "quantity": 2,  # 2x batch
    "unit": "piece",
    "batch": f"PROD-{BATCH_DATE}-001",
    "expiry_date": EXPIRY,
}
r = requests.post(f"{API_URL}/api/proxy/v2/inventory/production-run/complete", headers=H, json=payload)
d = r.json()
print(f"Response: {json.dumps(d)[:300]}")

if "exception" in d or d.get("status") == False:
    # Try alternative payload format
    print("\nTrying alternative format...")
    payload2 = {
        "bom_sub_recipe_id": test_sr["recipe_id"],
        "multiplier": 2,
        "batch_code": f"PROD-{BATCH_DATE}-001",
        "expiry_date": EXPIRY,
    }
    r = requests.post(f"{API_URL}/api/proxy/v2/inventory/production-run/complete", headers=H, json=payload2)
    d = r.json()
    print(f"Alt response: {json.dumps(d)[:300]}")
