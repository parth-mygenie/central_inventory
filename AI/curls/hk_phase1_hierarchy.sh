#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# Hells Kitchen (RID 803) — Full E2E Retest
# Date: 2026-07-10
# Fixes applied from validation reply:
#   - Child login: owner@{restaurantname}.com / Qplazm@10
#   - PO receive: `batch` not `batch_number`
#   - filter_bucket: correct batch_state/expiry_state per bucket
#   - sub-recipe: `subunit` not `unit`
#   - auto_fefo source_selector mode
# ══════════════════════════════════════════════════════════════════
set -uo pipefail
API="https://43de4f14-15c0-4614-bd13-9137aa93ff9d.preview.emergentagent.com/api"
PW="Qplazm@10"

login() { curl -s -X POST "$API/proxy/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$PW\",\"fcm_token\":\"test\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))"; }

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 1: LOGIN + HIERARCHY                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

MASTER_TOKEN=$(login "owner@hellskitchen.com")
echo "Master(803) Token: ${MASTER_TOKEN:0:30}..."

# Check existing children
echo ""
echo "=== Existing hierarchy ==="
curl -s "$API/proxy/v2/franchise/list?limit=50" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); data=d.get('data',d); children=data.get('children',[])
print(f'Existing children: {len(children)}')
for c in children: print(f'  RID={c.get(\"id\")}, name={c.get(\"name\")}, type={c.get(\"restaurant_type_flag\")}')
print(f'Allowed types: {data.get(\"allowed_child_types\",[])}')
"

echo ""
echo "=== Create B (Central) ==="
B_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"HK Central","email":"hkcentral@test.com","phone":"9300000001","address":"Central Wing","password":"Qplazm@10","child_type":"central"}')
B_RID=$(echo "$B_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('child',{}).get('id',''))" 2>/dev/null)
echo "B RID: $B_RID"

echo "=== Create C2 (Central) ==="
C2_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"HK Alpha Central","email":"hkalphacentral@test.com","phone":"9300000002","address":"Alpha Wing","password":"Qplazm@10","child_type":"central"}')
C2_RID=$(echo "$C2_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('child',{}).get('id',''))" 2>/dev/null)
echo "C2 RID: $C2_RID"

echo "=== Create E (Franchise, direct child of Master) ==="
E_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"HK Express","email":"hkexpress@test.com","phone":"9300000005","address":"Express Lane","password":"Qplazm@10","child_type":"franchise"}')
E_RID=$(echo "$E_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('child',{}).get('id',''))" 2>/dev/null)
echo "E RID: $E_RID"

# Login as B (Central) — format: owner@{restaurantname}.com (spaces removed, lowercase)
echo ""
echo "=== Login as B (owner@hkcentral.com) ==="
B_TOKEN=$(login "owner@hkcentral.com")
echo "B Token: ${B_TOKEN:0:30}..."

echo "=== Create C (Franchise under B) ==="
C_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"HK Outlet South","email":"hkoutletsouth@test.com","phone":"9300000003","address":"South Street","password":"Qplazm@10"}')
C_RID=$(echo "$C_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('child',{}).get('id',''))" 2>/dev/null)
echo "C RID: $C_RID"

echo "=== Login as C2 (owner@hkalphacentral.com) ==="
C2_TOKEN=$(login "owner@hkalphacentral.com")
echo "C2 Token: ${C2_TOKEN:0:30}..."

echo "=== Create D (Franchise under C2) ==="
D_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $C2_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"HK Outlet North","email":"hkoutletnorth@test.com","phone":"9300000004","address":"North Road","password":"Qplazm@10"}')
D_RID=$(echo "$D_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('child',{}).get('id',''))" 2>/dev/null)
echo "D RID: $D_RID"

# Login franchise tokens
echo ""
echo "=== Login franchise tokens ==="
C_TOKEN=$(login "owner@hkoutletsouth.com")
echo "C Token: ${C_TOKEN:0:30}..."
D_TOKEN=$(login "owner@hkoutletnorth.com")
echo "D Token: ${D_TOKEN:0:30}..."
E_TOKEN=$(login "owner@hkexpress.com")
echo "E Token: ${E_TOKEN:0:30}..."

echo ""
echo "=== Full hierarchy verification ==="
curl -s "$API/proxy/v2/franchise/list?limit=50" -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); data=d.get('data',d)
for c in data.get('children',[]):
    print(f'  RID={c.get(\"id\")}, name={c.get(\"name\")}, type={c.get(\"restaurant_type_flag\")}, parent={c.get(\"parent_restaurant_id\")}')
"
echo "--- B's children ---"
curl -s "$API/proxy/v2/franchise/list?limit=50" -H "Authorization: Bearer $B_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); data=d.get('data',d)
for c in data.get('children',[]): print(f'  RID={c.get(\"id\")}, name={c.get(\"name\")}, type={c.get(\"restaurant_type_flag\")}')
"
echo "--- C2's children ---"
curl -s "$API/proxy/v2/franchise/list?limit=50" -H "Authorization: Bearer $C2_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); data=d.get('data',d)
for c in data.get('children',[]): print(f'  RID={c.get(\"id\")}, name={c.get(\"name\")}, type={c.get(\"restaurant_type_flag\")}')
"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "HIERARCHY:"
echo "  A (Master)  = 803 (owner@hellskitchen.com)"
echo "  B (Central) = $B_RID (owner@hkcentral.com)"
echo "    C (Franchise under B) = $C_RID (owner@hkoutletsouth.com)"
echo "  C2 (Central) = $C2_RID (owner@hkalphacentral.com)"
echo "    D (Franchise under C2) = $D_RID (owner@hkoutletnorth.com)"
echo "  E (Franchise, direct) = $E_RID (owner@hkexpress.com)"
echo "══════════════════════════════════════════════════════════════"

# Save tokens and RIDs for subsequent scripts
cat > /tmp/hk_env.sh << ENVEOF
export API="$API"
export PW="$PW"
export MASTER_TOKEN="$MASTER_TOKEN"
export B_TOKEN="$B_TOKEN"
export C2_TOKEN="$C2_TOKEN"
export C_TOKEN="$C_TOKEN"
export D_TOKEN="$D_TOKEN"
export E_TOKEN="$E_TOKEN"
export A_RID=803
export B_RID=$B_RID
export C2_RID=$C2_RID
export C_RID=$C_RID
export D_RID=$D_RID
export E_RID=$E_RID
ENVEOF
echo "Environment saved to /tmp/hk_env.sh"
