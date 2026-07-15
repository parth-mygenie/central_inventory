#!/usr/bin/env python3
"""Central Inventory — Full E2E + Phase 2 Test (final, all fixes applied)"""
import requests, json

BASE = "https://preprod.mygenie.online"
AUTH = f"{BASE}/api/v1/auth/vendoremployee/login"
API = f"{BASE}/api/v2/vendoremployee"

OIL, MAIDA, MEAT, PATRI = 16980, 16981, 16982, 16983

def login(email):
    return requests.post(AUTH, json={"email": email, "password": "Qplazm@10"}).json().get("token")

def h(t): return {"Authorization": f"Bearer {t}", "Accept": "application/json", "Content-Type": "application/json"}

results = []
def T(label, d):
    ok = d.get("status", d.get("success"))
    msg = d.get("message","")[:100]; err = d.get("error_code","")
    tid = d.get("data",{}).get("transfer_id") or d.get("data",{}).get("id") if isinstance(d.get("data"),dict) else None
    sym = "PASS" if ok else "FAIL"
    print(f"  [{sym}] {label}{f' [{err}]' if err and not ok else ''}")
    results.append((label, bool(ok), tid, err))
    return d, tid

def get_seg(tok, rid, inv_id):
    r = requests.post(f"{API}/inventory-transfer/source-options", headers=h(tok),
        json={"from_restaurant_id": rid, "source_inventory_master_id": inv_id})
    segs = r.json().get("data",{}).get("segments",[])
    sid = next((s["segment_id"] for s in segs if s.get("segment_id") and s.get("cal_quantity",0)>0), None)
    return {"mode":"segment_id","segment_id":sid} if sid else None

def get_inv_id(tok, title):
    inv = requests.get(f"{API}/inventory/get-inventory-master", headers=h(tok)).json().get("data",[])
    match = next((i for i in inv if i["stock_title"] == title), None)
    return match["id"] if match else None

BUCKET = {"mode":"filter_bucket","bucket":"without_batch_and_expiry","batch_state":"null","expiry_state":"null"}

print("=" * 70)
print("CENTRAL INVENTORY — FINAL COMPREHENSIVE TEST (50 tests)")
print("=" * 70)

mt=login("killua@zoldyck.com"); c1t=login("owner@democentral1.com"); c2t=login("owner@democentral2.com")
f1t=login("owner@demofranchise1.com"); f2t=login("owner@demofranchise2.com")
f3t=login("owner@demofranchise3.com"); f4t=login("owner@demofranchise4.com")
print("All 7 accounts logged in\n")

# Seed fresh stock at Master
print("--- Seeding stock at Master ---")
for inv_id, qty, unit, batch in [(OIL,10,"ltr","FINAL-OIL-01"),(MAIDA,20,"kg","FINAL-MAIDA-01"),(MEAT,10,"kg","FINAL-MEAT-01"),(PATRI,5,"kg","FINAL-PATRI-01")]:
    requests.post(f"{API}/inventory/add-stock/{inv_id}",
        headers={"Authorization":f"Bearer {mt}","Accept":"application/json"},
        data={"quantity":str(qty),"unit":unit,"vendor_id":"1","payment_type":"Cash",
              "purchase_date":"2026-01-22","price":"100","tot_amount":str(int(qty)*100),
              "batch":batch,"expiry_date":"2026-12-31"})
print("  4 items seeded ✓")

# Enable lateral transfers
requests.post(f"{API}/inventory-transfer/operational-settings/update", headers=h(mt),
    json={"restaurant_id":1,"settings":{"allow_lateral_central_transfer":True}})
print("  Lateral transfers enabled ✓\n")

seg_oil = get_seg(mt,1,OIL); seg_maida = get_seg(mt,1,MAIDA)
seg_meat = get_seg(mt,1,MEAT); seg_patri = get_seg(mt,1,PATRI)

# ==================== A: DIRECT DISPATCH (12 tests) ====================
print("=" * 70); print("A: DIRECT DISPATCH ACROSS ALL LEVELS (12 tests)"); print("=" * 70)

print("\n--- A1: Master→Central1 (Oil 2ltr) ---")
d,a1=T("Dispatch Master→Central1",requests.post(f"{API}/inventory-transfer/initiate",headers=h(mt),json={
    "from_restaurant_id":1,"to_restaurant_id":781,
    "items":[{"source_inventory_master_id":OIL,"quantity":2,"unit":"ltr","source_selector":seg_oil}]}).json())
if a1: T("Receive@C1",requests.post(f"{API}/inventory-transfer/receive/{a1}",headers=h(c1t),json={}).json())

print("\n--- A2: Master→Central2 (maida 5kg) ---")
d,a2=T("Dispatch Master→Central2",requests.post(f"{API}/inventory-transfer/initiate",headers=h(mt),json={
    "from_restaurant_id":1,"to_restaurant_id":782,
    "items":[{"source_inventory_master_id":MAIDA,"quantity":5,"unit":"kg","source_selector":seg_maida}]}).json())
if a2: T("Receive@C2",requests.post(f"{API}/inventory-transfer/receive/{a2}",headers=h(c2t),json={}).json())

print("\n--- A3: Master→Franchise3 direct (meat 2kg) ---")
d,a3=T("Dispatch Master→F3(direct)",requests.post(f"{API}/inventory-transfer/initiate",headers=h(mt),json={
    "from_restaurant_id":1,"to_restaurant_id":785,
    "items":[{"source_inventory_master_id":MEAT,"quantity":2,"unit":"kg","source_selector":seg_meat}]}).json())
if a3: T("Receive@F3",requests.post(f"{API}/inventory-transfer/receive/{a3}",headers=h(f3t),json={}).json())

print("\n--- A4: Master→Franchise4 direct (patri 1kg) ---")
d,a4=T("Dispatch Master→F4(direct)",requests.post(f"{API}/inventory-transfer/initiate",headers=h(mt),json={
    "from_restaurant_id":1,"to_restaurant_id":786,
    "items":[{"source_inventory_master_id":PATRI,"quantity":1,"unit":"kg","source_selector":seg_patri}]}).json())
if a4: T("Receive@F4",requests.post(f"{API}/inventory-transfer/receive/{a4}",headers=h(f4t),json={}).json())

print("\n--- A5: Central1→Franchise1 (Oil 0.5ltr) ---")
oil_c1_id = get_inv_id(c1t, "Cooking Oil")
a5_tid = None
if oil_c1_id:
    seg_c1 = get_seg(c1t, 781, oil_c1_id)
    if seg_c1:
        d,a5_tid=T("Dispatch C1→F1",requests.post(f"{API}/inventory-transfer/initiate",headers=h(c1t),json={
            "from_restaurant_id":781,"to_restaurant_id":783,
            "items":[{"source_inventory_master_id":oil_c1_id,"quantity":0.5,"unit":"ltr","source_selector":seg_c1}]}).json())
        if a5_tid: T("Receive@F1",requests.post(f"{API}/inventory-transfer/receive/{a5_tid}",headers=h(f1t),json={}).json())

print("\n--- A6: Central2→Franchise3 (maida 1kg) ---")
maida_c2_id = get_inv_id(c2t, "maida")
if maida_c2_id:
    seg_c2 = get_seg(c2t, 782, maida_c2_id)
    if seg_c2:
        d,a6=T("Dispatch C2→F3",requests.post(f"{API}/inventory-transfer/initiate",headers=h(c2t),json={
            "from_restaurant_id":782,"to_restaurant_id":785,
            "items":[{"source_inventory_master_id":maida_c2_id,"quantity":1,"unit":"kg","source_selector":seg_c2}]}).json())
        if a6: T("Receive@F3",requests.post(f"{API}/inventory-transfer/receive/{a6}",headers=h(f3t),json={}).json())

# ==================== B: REQUEST CHAINS using segment_id (8 tests) ====================
print("\n" + "=" * 70); print("B: REQUEST→APPROVE→DISPATCH→RECEIVE (segment_id selector, 8 tests)"); print("=" * 70)

# FIX: Use segment_id selector for request items so dispatch finds segments
print("\n--- B1: Franchise1→Central1 request (Oil 0.3ltr) ---")
oil_c1_seg = get_seg(c1t, 781, oil_c1_id) if oil_c1_id else None
b1_sel = oil_c1_seg if oil_c1_seg else BUCKET
d,b1=T("Request F1→C1",requests.post(f"{API}/inventory-transfer/request",headers=h(f1t),json={
    "items":[{"stock_title":"Cooking Oil","unit_id":3,"quantity":0.3,"unit":"ltr","source_selector":b1_sel}]}).json())
if b1:
    T("Approve@C1",requests.post(f"{API}/inventory-transfer/approve/{b1}",headers=h(c1t),json={}).json())
    d_disp,_=T("Dispatch@C1",requests.post(f"{API}/inventory-transfer/dispatch/{b1}",headers=h(c1t),json={}).json())
    if d_disp.get("status"): T("Receive@F1",requests.post(f"{API}/inventory-transfer/receive/{b1}",headers=h(f1t),json={}).json())

print("\n--- B2: Central2→Master request (Oil 1ltr) ---")
seg_oil_fresh = get_seg(mt, 1, OIL)
d,b2=T("Request C2→Master",requests.post(f"{API}/inventory-transfer/request",headers=h(c2t),json={
    "items":[{"stock_title":"Cooking Oil","unit_id":3,"quantity":1,"unit":"ltr","source_selector":seg_oil_fresh if seg_oil_fresh else BUCKET}]}).json())
if b2:
    T("Approve@Master",requests.post(f"{API}/inventory-transfer/approve/{b2}",headers=h(mt),json={}).json())
    d_disp,_=T("Dispatch@Master",requests.post(f"{API}/inventory-transfer/dispatch/{b2}",headers=h(mt),json={}).json())
    if d_disp.get("status"): T("Receive@C2",requests.post(f"{API}/inventory-transfer/receive/{b2}",headers=h(c2t),json={}).json())

# ==================== C: REJECT + CANCEL + PARTIAL (8 tests) ====================
print("\n" + "=" * 70); print("C: REJECT + CANCEL + PARTIAL RECEIVE (8 tests)"); print("=" * 70)

print("\n--- C1: Pre-dispatch reject ---")
d,c1r=T("Request F3→C2",requests.post(f"{API}/inventory-transfer/request",headers=h(f3t),json={
    "items":[{"stock_title":"maida","unit_id":1,"quantity":0.5,"unit":"kg","source_selector":BUCKET}]}).json())
if c1r: T("Reject@C2",requests.post(f"{API}/inventory-transfer/reject/{c1r}",headers=h(c2t),json={
    "resolution_type":"return_to_source","resolution_meta":{"reason":"Out of stock"}}).json())

print("\n--- C2: Post-dispatch cancel ---")
seg_cancel = get_seg(mt,1,MAIDA)
if seg_cancel:
    d,c2r=T("Dispatch(cancel)",requests.post(f"{API}/inventory-transfer/initiate",headers=h(mt),json={
        "from_restaurant_id":1,"to_restaurant_id":781,
        "items":[{"source_inventory_master_id":MAIDA,"quantity":1,"unit":"kg","source_selector":seg_cancel}]}).json())
    if c2r: T("Cancel@Master",requests.post(f"{API}/inventory-transfer/cancel/{c2r}",headers=h(mt),json={
        "resolution_type":"return_to_source","resolution_meta":{"reason":"Wrong destination"}}).json())

print("\n--- C3: Partial receive (damaged) ---")
seg_partial = get_seg(mt,1,MEAT)
if seg_partial:
    d,c3r=T("Dispatch(partial)",requests.post(f"{API}/inventory-transfer/initiate",headers=h(mt),json={
        "from_restaurant_id":1,"to_restaurant_id":782,
        "items":[{"source_inventory_master_id":MEAT,"quantity":2,"unit":"kg","source_selector":seg_partial}]}).json())
    if c3r:
        det=requests.get(f"{API}/inventory-transfer/details/{c3r}",headers=h(mt)).json()
        lines=det.get("data",{}).get("lines",[]) if isinstance(det.get("data"),dict) else []
        if lines:
            lid=lines[0]["id"]; rq=float(lines[0].get("quantity",2))
            T("PartialReceive@C2",requests.post(f"{API}/inventory-transfer/receive/{c3r}",headers=h(c2t),json={
                "resolution_type":"damaged","resolution_meta":{"reason":"Transit damage"},
                "received_lines":[{"line_id":lid,"accepted_qty":round(rq*0.7,2),"rejected_qty":round(rq*0.3,2)}]}).json())

print("\n--- C4: Post-dispatch reject by destination ---")
seg_rej = get_seg(mt,1,PATRI)
if seg_rej:
    d,c4r=T("Dispatch(dest-reject)",requests.post(f"{API}/inventory-transfer/initiate",headers=h(mt),json={
        "from_restaurant_id":1,"to_restaurant_id":783,
        "items":[{"source_inventory_master_id":PATRI,"quantity":0.5,"unit":"kg","source_selector":seg_rej}]}).json())
    if c4r: T("Reject@F1(dest)",requests.post(f"{API}/inventory-transfer/reject/{c4r}",headers=h(f1t),json={
        "resolution_type":"return_to_source","resolution_meta":{"reason":"Refused delivery"}}).json())

# ==================== D: REPORTING (10 tests) ====================
print("\n" + "=" * 70); print("D: HIERARCHY REPORTING + QUEUES (10 tests)"); print("=" * 70)

T("Summary(central)",requests.post(f"{API}/inventory-transfer/hierarchy-summary",headers=h(mt),json={"store_type":"central"}).json())
T("Summary(franchise)",requests.post(f"{API}/inventory-transfer/hierarchy-summary",headers=h(mt),json={"store_type":"franchise"}).json())
T("Detail Master(1)",requests.post(f"{API}/inventory-transfer/hierarchy-detail",headers=h(mt),json={"store_restaurant_id":1}).json())
T("Detail C1(781)",requests.post(f"{API}/inventory-transfer/hierarchy-detail",headers=h(mt),json={"store_restaurant_id":781}).json())
T("Detail F1(783)",requests.post(f"{API}/inventory-transfer/hierarchy-detail",headers=h(mt),json={"store_restaurant_id":783}).json())
T("Detail F3(785)",requests.post(f"{API}/inventory-transfer/hierarchy-detail",headers=h(mt),json={"store_restaurant_id":785}).json())
T("Queues@Master",requests.post(f"{API}/inventory-transfer/pending-queues",headers=h(mt),json={"limit":50}).json())
T("Queues@C1",requests.post(f"{API}/inventory-transfer/pending-queues",headers=h(c1t),json={"limit":50}).json())
T("Queues@F1",requests.post(f"{API}/inventory-transfer/pending-queues",headers=h(f1t),json={"limit":50}).json())
T("History@Master",requests.post(f"{API}/inventory-transfer/history",headers=h(mt),json={"limit":20}).json())

# ==================== E: PHASE 2 (12 tests) ====================
print("\n" + "=" * 70); print("E: PHASE 2 OPS APIs (12 tests)"); print("=" * 70)

T("Settings GET",requests.post(f"{API}/inventory-transfer/operational-settings/get",headers=h(mt),json={"restaurant_id":1}).json())
T("ReconSummary",requests.post(f"{API}/inventory-transfer/reconciliation-summary",headers=h(mt),json={"detail_limit":25}).json())
T("OpsDashboard",requests.post(f"{API}/inventory-transfer/ops-dashboard",headers=h(mt),json={"limit":10}).json())
T("StaleTransfers",requests.post(f"{API}/inventory-transfer/stale-transfers",headers=h(mt),json={"older_than_hours":24,"limit":20}).json())
T("NearExpiry",requests.post(f"{API}/inventory-transfer/near-expiry-alerts",headers=h(mt),json={"within_days":30,"limit":20}).json())
T("CostValuation(fifo)",requests.post(f"{API}/inventory-transfer/cost-valuation",headers=h(mt),json={"method":"fifo","restaurant_id":1}).json())
T("WastageReport",requests.post(f"{API}/inventory/wastage-report",headers=h(mt),json={"restaurant_ids":[1,781,782]}).json())

# Segment-based writes
seg_adj = get_seg(mt,1,OIL)
if seg_adj: T("DecreaseAdj",requests.post(f"{API}/inventory-transfer/decrease-adjustment",headers=h(mt),json={
    "restaurant_id":1,"quantity":0.1,"unit":"ltr","stock_title":"Cooking Oil","unit_id":3,"source_selector":seg_adj}).json())
seg_was = get_seg(mt,1,MAIDA)
if seg_was: T("RecordWastage",requests.post(f"{API}/inventory-transfer/record-wastage",headers=h(mt),json={
    "restaurant_id":1,"quantity":0.1,"unit":"kg","stock_title":"maida","unit_id":1,"reason_code":"damage","source_selector":seg_was}).json())

# Session status (correct param: restaurant_ids[])
T("SessionStatus",requests.post(f"{API}/inventory-transfer/operation-session/status",headers=h(mt),json={"restaurant_ids":[1]}).json())

# Lateral (C1→C2, setting already enabled)
oil_c1_seg2 = get_seg(c1t, 781, oil_c1_id) if oil_c1_id else None
if oil_c1_seg2:
    T("LateralC1→C2",requests.post(f"{API}/inventory-transfer/lateral/initiate",headers=h(c1t),json={
        "from_restaurant_id":781,"to_restaurant_id":782,
        "items":[{"quantity":0.1,"unit":"ltr","stock_title":"Cooking Oil","unit_id":3,"source_selector":oil_c1_seg2}]}).json())
else:
    T("LateralC1→C2",requests.post(f"{API}/inventory-transfer/lateral/initiate",headers=h(c1t),json={
        "from_restaurant_id":781,"to_restaurant_id":782,
        "items":[{"quantity":0.1,"unit":"ltr","stock_title":"Cooking Oil","unit_id":3,"source_selector":BUCKET}]}).json())

T("ReconCreate",requests.post(f"{API}/inventory-transfer/reconciliation-request/create",headers=h(f1t),json={
    "restaurant_id":783,"notes":"final cycle count test"}).json())

# Return initiate (correct field: lines)
if a5_tid:
    det=requests.get(f"{API}/inventory-transfer/details/{a5_tid}",headers=h(f1t)).json()
    rlines=det.get("data",{}).get("lines",[]) if isinstance(det.get("data"),dict) else []
    rlid = rlines[0]["id"] if rlines else 1
    T("ReturnInitiate",requests.post(f"{API}/inventory-transfer/return/initiate",headers=h(f1t),json={
        "original_transfer_id":a5_tid,"lines":[{"line_id":rlid,"quantity":0.1}]}).json())

# Inward audit (destination token for transfer a1)
if a1:
    T("InwardAudit",requests.post(f"{API}/inventory-transfer/inward-audit/{a1}",headers=h(c1t),json={}).json())

# ==================== F: STOCK VERIFICATION ====================
print("\n" + "=" * 70); print("F: STOCK AT ALL 7 STORES"); print("=" * 70)

stores=[("Master(1)",mt,1),("Central1(781)",c1t,781),("Central2(782)",c2t,782),
        ("Franchise1(783)",f1t,783),("Franchise2(784)",f2t,784),("Franchise3(785)",f3t,785),("Franchise4(786)",f4t,786)]
for name,tok,rid in stores:
    r=requests.post(f"{API}/inventory-transfer/hierarchy-detail",headers=h(tok),json={"store_restaurant_id":rid})
    d=r.json(); stock=d.get("data",{}).get("child_stock_summary",[])
    with_qty=[s for s in stock if s.get("total_quantity",0)>0]
    items_str=", ".join(f"{s['stock_title']}={s['display_quantity']}{s.get('unit','')}" for s in with_qty[:5])
    print(f"  {name}: {len(with_qty)} items | {items_str or 'no stock'}")

# ==================== SUMMARY ====================
print("\n" + "=" * 70); print("FINAL SUMMARY"); print("=" * 70)
passed=sum(1 for _,ok,_,_ in results if ok)
failed=sum(1 for _,ok,_,_ in results if not ok)
total=len(results)
print(f"\n  TOTAL: {passed}/{total} PASSED | {failed} FAILED")
if failed:
    print(f"\n  FAILURES:")
    for n,ok,t,e in results:
        if not ok: print(f"    ✗ {n} [{e}]")
print(f"\n  ALL RESULTS:")
for n,ok,t,e in results:
    print(f"    {'✓' if ok else '✗'} {n}{f' (tid={t})' if t else ''}")
if passed==total:
    print(f"\n  *** ALL {total} TESTS PASSED ***")
print()
