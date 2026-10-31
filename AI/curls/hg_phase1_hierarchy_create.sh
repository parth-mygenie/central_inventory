#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# Heaven Garden (RID 799) — Full E2E Test Script
# Date: 2026-07-10
# ══════════════════════════════════════════════════════════════════
# Hierarchy Tree:
#   A (master, RID 799) — owner@heavengarden.com
#   ├── B (central) — central_b@heavengarden.com
#   │   └── C (franchise) — franchise_c@heavengarden.com
#   ├── C2 (central) — central_c2@heavengarden.com
#   │   └── D (franchise) — franchise_d@heavengarden.com
#   └── E (franchise) — franchise_e@heavengarden.com
# ══════════════════════════════════════════════════════════════════

set -euo pipefail
API="https://43de4f14-15c0-4614-bd13-9137aa93ff9d.preview.emergentagent.com/api"
PASSWORD="Qplazm@10"
TIMESTAMP=$(date +%s)

# ── Helper: login ────────────────────────────────────────────────
login() {
  local email="$1"
  curl -s -X POST "$API/proxy/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"fcm_token\":\"test\"}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))"
}

# ── Helper: pretty-print JSON ────────────────────────────────────
pp() { python3 -m json.tool 2>/dev/null || cat; }

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 1: LOGIN & TOKEN SETUP                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"

MASTER_TOKEN=$(login "owner@heavengarden.com")
echo "Master Token: ${MASTER_TOKEN:0:30}..."
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PHASE 2: CREATE HIERARCHY TREE                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo ""
echo "=== 2.1: Get create form (Master) ==="
curl -s "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" | pp
echo ""

echo "=== 2.2: Create B (central, child of A) ==="
B_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"HG Central Kitchen B\",\"email\":\"central_b@heavengarden.com\",\"phone\":\"9100000001\",\"address\":\"Central B, HG Complex\",\"password\":\"$PASSWORD\",\"child_type\":\"central\"}")
echo "$B_RESP" | pp
B_RID=$(echo "$B_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('data',d).get('child',d.get('data',{})); print(c.get('id',c.get('restaurant_id','')))" 2>/dev/null || echo "")
echo "B RID: $B_RID"
echo ""

echo "=== 2.3: Create C2 (central, child of A) ==="
C2_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"HG Central Kitchen C2\",\"email\":\"central_c2@heavengarden.com\",\"phone\":\"9100000002\",\"address\":\"Central C2, HG Complex\",\"password\":\"$PASSWORD\",\"child_type\":\"central\"}")
echo "$C2_RESP" | pp
C2_RID=$(echo "$C2_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('data',d).get('child',d.get('data',{})); print(c.get('id',c.get('restaurant_id','')))" 2>/dev/null || echo "")
echo "C2 RID: $C2_RID"
echo ""

echo "=== 2.4: Create E (franchise, direct child of A) ==="
E_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"HG Outlet E\",\"email\":\"franchise_e@heavengarden.com\",\"phone\":\"9100000005\",\"address\":\"Outlet E, HG Street\",\"password\":\"$PASSWORD\",\"child_type\":\"franchise\"}")
echo "$E_RESP" | pp
E_RID=$(echo "$E_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('data',d).get('child',d.get('data',{})); print(c.get('id',c.get('restaurant_id','')))" 2>/dev/null || echo "")
echo "E RID: $E_RID"
echo ""

echo "=== 2.5: Login as B (central) to create C (franchise under B) ==="
B_TOKEN=$(login "central_b@heavengarden.com")
echo "B Token: ${B_TOKEN:0:30}..."

C_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"HG Franchise C\",\"email\":\"franchise_c@heavengarden.com\",\"phone\":\"9100000003\",\"address\":\"Franchise C, HG Lane\",\"password\":\"$PASSWORD\"}")
echo "$C_RESP" | pp
C_RID=$(echo "$C_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('data',d).get('child',d.get('data',{})); print(c.get('id',c.get('restaurant_id','')))" 2>/dev/null || echo "")
echo "C RID: $C_RID"
echo ""

echo "=== 2.6: Login as C2 (central) to create D (franchise under C2) ==="
C2_TOKEN=$(login "central_c2@heavengarden.com")
echo "C2 Token: ${C2_TOKEN:0:30}..."

D_RESP=$(curl -s -X POST "$API/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $C2_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"HG Franchise D\",\"email\":\"franchise_d@heavengarden.com\",\"phone\":\"9100000004\",\"address\":\"Franchise D, HG Road\",\"password\":\"$PASSWORD\"}")
echo "$D_RESP" | pp
D_RID=$(echo "$D_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('data',d).get('child',d.get('data',{})); print(c.get('id',c.get('restaurant_id','')))" 2>/dev/null || echo "")
echo "D RID: $D_RID"
echo ""

echo "=== 2.7: Verify full hierarchy from Master ==="
curl -s "$API/proxy/v2/franchise/list?limit=50" \
  -H "Authorization: Bearer $MASTER_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
children = data.get('children', [])
print(f'Total direct children of Master: {len(children)}')
for c in children:
    print(f'  RID={c.get(\"id\")}, name={c.get(\"name\")}, type={c.get(\"restaurant_type_flag\")}, parent={c.get(\"parent_restaurant_id\")}')
"
echo ""

echo "=== 2.8: Verify B's children ==="
curl -s "$API/proxy/v2/franchise/list?limit=50" \
  -H "Authorization: Bearer $B_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
children = data.get('children', [])
print(f'Total children of B: {len(children)}')
for c in children:
    print(f'  RID={c.get(\"id\")}, name={c.get(\"name\")}, type={c.get(\"restaurant_type_flag\")}, parent={c.get(\"parent_restaurant_id\")}')
"
echo ""

echo "=== 2.9: Verify C2's children ==="
curl -s "$API/proxy/v2/franchise/list?limit=50" \
  -H "Authorization: Bearer $C2_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
children = data.get('children', [])
print(f'Total children of C2: {len(children)}')
for c in children:
    print(f'  RID={c.get(\"id\")}, name={c.get(\"name\")}, type={c.get(\"restaurant_type_flag\")}, parent={c.get(\"parent_restaurant_id\")}')
"

# Export RIDs for subsequent scripts
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "HIERARCHY TREE CREATED:"
echo "  A (Master) = RID 799 (owner@heavengarden.com)"
echo "  B (Central) = RID $B_RID (central_b@heavengarden.com)"
echo "  C (Franchise under B) = RID $C_RID (franchise_c@heavengarden.com)"
echo "  C2 (Central) = RID $C2_RID (central_c2@heavengarden.com)"
echo "  D (Franchise under C2) = RID $D_RID (franchise_d@heavengarden.com)"
echo "  E (Franchise, direct child of A) = RID $E_RID (franchise_e@heavengarden.com)"
echo "══════════════════════════════════════════════════════════════"
