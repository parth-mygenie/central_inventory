"""
Central Inventory — Comprehensive Seed Data
Covers all screen states for UX building exercise.

Hierarchy:
  My Genie (ID=1, master=Central Store)
  ├── DemoCentral1 (ID=781, central=Master Store)
  │   ├── DemoFranchise1 (ID=783, franchise=Outlet)
  │   └── DemoFranchise2 (ID=784, franchise=Outlet)
  └── DemoCentral2 (ID=782, central=Master Store)
      ├── DemoFranchise3 (ID=785, franchise=Outlet)
      └── DemoFranchise4 (ID=786, franchise=Outlet)
"""

from datetime import datetime, timedelta, timezone
import random

now = datetime.now(timezone.utc)
today = now.strftime("%Y-%m-%d")
yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
two_days_ago = (now - timedelta(days=2)).strftime("%Y-%m-%d")
week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")

# ── Restaurants ───────────────────────────────────────────────────

RESTAURANTS = {
    1:   {"id": 1,   "name": "My Genie",        "restaurant_type": "master",    "restaurant_type_flag": "master",    "parent_restaurant_id": None},
    781: {"id": 781, "name": "DemoCentral1",     "restaurant_type": "central",   "restaurant_type_flag": "central",   "parent_restaurant_id": 1},
    782: {"id": 782, "name": "DemoCentral2",     "restaurant_type": "central",   "restaurant_type_flag": "central",   "parent_restaurant_id": 1},
    783: {"id": 783, "name": "DemoFranchise1",   "restaurant_type": "franchise", "restaurant_type_flag": "franchise", "parent_restaurant_id": 781},
    784: {"id": 784, "name": "DemoFranchise2",   "restaurant_type": "franchise", "restaurant_type_flag": "franchise", "parent_restaurant_id": 781},
    785: {"id": 785, "name": "DemoFranchise3",   "restaurant_type": "franchise", "restaurant_type_flag": "franchise", "parent_restaurant_id": 782},
    786: {"id": 786, "name": "DemoFranchise4",   "restaurant_type": "franchise", "restaurant_type_flag": "franchise", "parent_restaurant_id": 782},
}

# Login email → restaurant mapping
EMAIL_RESTAURANT_MAP = {
    "abhishek@kalabahia.com":      1,
    "killua@zoldyck.com":          1,
    "owner@democentral1.com":      781,
    "owner@democentral2.com":      782,
    "owner@demofranchise1.com":    783,
    "owner@demofranchise2.com":    784,
    "owner@demofranchise3.com":    785,
    "owner@demofranchise4.com":    786,
}

# ── Inventory Items ───────────────────────────────────────────────

INVENTORY_ITEMS = [
    {"id": 3570, "stock_title": "Butter",             "unit": "kg",  "unit_id": 1},
    {"id": 3571, "stock_title": "Ginger Garlic Paste", "unit": "kg",  "unit_id": 1},
    {"id": 3572, "stock_title": "Cooking Oil",         "unit": "ltr", "unit_id": 3},
    {"id": 3573, "stock_title": "Onions",              "unit": "kg",  "unit_id": 1},
    {"id": 3574, "stock_title": "Tomatoes",            "unit": "kg",  "unit_id": 1},
    {"id": 3575, "stock_title": "Basmati Rice",        "unit": "kg",  "unit_id": 1},
    {"id": 3576, "stock_title": "Water Bottles",       "unit": "pcs", "unit_id": 5},
    {"id": 3577, "stock_title": "Chicken",             "unit": "kg",  "unit_id": 1},
    {"id": 3578, "stock_title": "Salt",                "unit": "kg",  "unit_id": 1},
    {"id": 3579, "stock_title": "Sugar",               "unit": "kg",  "unit_id": 1},
    {"id": 3580, "stock_title": "Flour (Atta)",        "unit": "kg",  "unit_id": 1},
    {"id": 3581, "stock_title": "Paneer",              "unit": "kg",  "unit_id": 1},
    {"id": 3582, "stock_title": "Milk",                "unit": "ltr", "unit_id": 3},
    {"id": 3583, "stock_title": "Cream",               "unit": "ltr", "unit_id": 3},
    {"id": 3584, "stock_title": "Cashew Nuts",         "unit": "kg",  "unit_id": 1},
    {"id": 765,  "stock_title": "Sea Shore",           "unit": "ltr", "unit_id": 3},
]

# ── Stock per store ───────────────────────────────────────────────

def _stock_for_store(restaurant_id):
    """Generate realistic stock levels per store."""
    random.seed(restaurant_id)
    stock = []
    for item in INVENTORY_ITEMS:
        if restaurant_id == 1:  # Central — high stock
            qty = round(random.uniform(50, 500), 2)
            low = False
        elif restaurant_id in (781, 782):  # Master — medium
            qty = round(random.uniform(10, 200), 2)
            low = qty < 20
        else:  # Outlet — lower, some critically low
            qty = round(random.uniform(0.5, 80), 2)
            low = qty < 10
        if item["unit"] == "pcs":
            qty = int(qty)
        stock.append({
            "stock_title": item["stock_title"],
            "unit": item["unit"],
            "unit_id": item["unit_id"],
            "inventory_master_id": item["id"],
            "cal_quantity": qty,
            "display_qty": qty,
            "is_low_stock": low,
        })
    return stock


def _batches_for_stock(restaurant_id, stock_title, unit_id):
    """Generate batch/expiry data for a stock item."""
    random.seed(hash((restaurant_id, stock_title)))
    batches = []
    num = random.randint(1, 4)
    for i in range(num):
        exp_days = random.randint(-5, 90)
        expiry = (now + timedelta(days=exp_days)).strftime("%Y-%m-%d") if exp_days > 0 else None
        batches.append({
            "batch": f"BTH-{restaurant_id}-{stock_title[:3].upper()}-{i+1:03d}",
            "expiry_date": expiry,
            "cal_quantity": round(random.uniform(1, 50), 2),
            "segment_id": random.randint(1000, 9999),
        })
    return batches


# ── Transfers (comprehensive status coverage) ─────────────────────

TRANSFERS = [
    # Requested — waiting approval (approval_pending for parent)
    {
        "id": 101, "type": "request",
        "from_restaurant_id": 1, "to_restaurant_id": 783,
        "from_restaurant": {"restaurant_name": "My Genie", "restaurant_type": "master"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise1", "restaurant_type": "franchise"},
        "status": "requested", "resolution_type": None,
        "requested_by": 4520, "requested_at": (now - timedelta(hours=3)).isoformat(),
        "approved_by": None, "approved_at": None,
        "dispatched_by": None, "dispatched_at": None,
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(hours=3)).isoformat(),
        "updated_at": (now - timedelta(hours=3)).isoformat(),
        "lines": [
            {"id": 201, "stock_title": "Butter", "quantity": 10, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 1001}},
            {"id": 202, "stock_title": "Cooking Oil", "quantity": 5, "unit": "ltr", "source_selector": {"mode": "segment_id", "segment_id": 1002}},
        ],
    },
    {
        "id": 102, "type": "request",
        "from_restaurant_id": 781, "to_restaurant_id": 783,
        "from_restaurant": {"restaurant_name": "DemoCentral1", "restaurant_type": "central"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise1", "restaurant_type": "franchise"},
        "status": "requested", "resolution_type": None,
        "requested_by": 4520, "requested_at": (now - timedelta(hours=5)).isoformat(),
        "approved_by": None, "approved_at": None,
        "dispatched_by": None, "dispatched_at": None,
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(hours=5)).isoformat(),
        "updated_at": (now - timedelta(hours=5)).isoformat(),
        "lines": [
            {"id": 203, "stock_title": "Chicken", "quantity": 20, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 1003}},
            {"id": 204, "stock_title": "Paneer", "quantity": 8, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 1004}},
            {"id": 205, "stock_title": "Cream", "quantity": 3, "unit": "ltr", "source_selector": {"mode": "segment_id", "segment_id": 1005}},
        ],
    },
    {
        "id": 103, "type": "request",
        "from_restaurant_id": 782, "to_restaurant_id": 785,
        "from_restaurant": {"restaurant_name": "DemoCentral2", "restaurant_type": "central"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise3", "restaurant_type": "franchise"},
        "status": "requested", "resolution_type": None,
        "requested_by": 4530, "requested_at": (now - timedelta(hours=1)).isoformat(),
        "approved_by": None, "approved_at": None,
        "dispatched_by": None, "dispatched_at": None,
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(hours=1)).isoformat(),
        "updated_at": (now - timedelta(hours=1)).isoformat(),
        "lines": [
            {"id": 206, "stock_title": "Basmati Rice", "quantity": 25, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 1006}},
        ],
    },
    # Approved — waiting dispatch
    {
        "id": 104, "type": "request",
        "from_restaurant_id": 1, "to_restaurant_id": 781,
        "from_restaurant": {"restaurant_name": "My Genie", "restaurant_type": "master"},
        "to_restaurant":   {"restaurant_name": "DemoCentral1", "restaurant_type": "central"},
        "status": "approved", "resolution_type": None,
        "requested_by": 4510, "requested_at": (now - timedelta(days=1)).isoformat(),
        "approved_by": 4062, "approved_at": (now - timedelta(hours=18)).isoformat(),
        "dispatched_by": None, "dispatched_at": None,
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(days=1)).isoformat(),
        "updated_at": (now - timedelta(hours=18)).isoformat(),
        "lines": [
            {"id": 207, "stock_title": "Flour (Atta)", "quantity": 50, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 1007}},
            {"id": 208, "stock_title": "Sugar", "quantity": 30, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 1008}},
            {"id": 209, "stock_title": "Salt", "quantity": 15, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 1009}},
        ],
    },
    # Dispatched — waiting receive (receive_pending for destination)
    {
        "id": 105, "type": "dispatch",
        "from_restaurant_id": 1, "to_restaurant_id": 782,
        "from_restaurant": {"restaurant_name": "My Genie", "restaurant_type": "master"},
        "to_restaurant":   {"restaurant_name": "DemoCentral2", "restaurant_type": "central"},
        "status": "dispatched", "resolution_type": None,
        "requested_by": None, "requested_at": None,
        "approved_by": None, "approved_at": None,
        "dispatched_by": 4062, "dispatched_at": (now - timedelta(hours=6)).isoformat(),
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(hours=6)).isoformat(),
        "updated_at": (now - timedelta(hours=6)).isoformat(),
        "lines": [
            {"id": 210, "stock_title": "Butter", "quantity": 15, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 2001}},
            {"id": 211, "stock_title": "Ginger Garlic Paste", "quantity": 5, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 2002}},
            {"id": 212, "stock_title": "Cashew Nuts", "quantity": 2, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 2003}},
        ],
    },
    {
        "id": 106, "type": "dispatch",
        "from_restaurant_id": 781, "to_restaurant_id": 784,
        "from_restaurant": {"restaurant_name": "DemoCentral1", "restaurant_type": "central"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise2", "restaurant_type": "franchise"},
        "status": "dispatched", "resolution_type": None,
        "requested_by": None, "requested_at": None,
        "approved_by": None, "approved_at": None,
        "dispatched_by": 4510, "dispatched_at": (now - timedelta(hours=2)).isoformat(),
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(hours=2)).isoformat(),
        "updated_at": (now - timedelta(hours=2)).isoformat(),
        "lines": [
            {"id": 213, "stock_title": "Chicken", "quantity": 12, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 2004}},
            {"id": 214, "stock_title": "Onions", "quantity": 8, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 2005}},
        ],
    },
    {
        "id": 107, "type": "dispatch",
        "from_restaurant_id": 782, "to_restaurant_id": 786,
        "from_restaurant": {"restaurant_name": "DemoCentral2", "restaurant_type": "central"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise4", "restaurant_type": "franchise"},
        "status": "dispatched", "resolution_type": None,
        "requested_by": None, "requested_at": None,
        "approved_by": None, "approved_at": None,
        "dispatched_by": 4515, "dispatched_at": (now - timedelta(hours=4)).isoformat(),
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(hours=4)).isoformat(),
        "updated_at": (now - timedelta(hours=4)).isoformat(),
        "lines": [
            {"id": 215, "stock_title": "Milk", "quantity": 20, "unit": "ltr", "source_selector": {"mode": "segment_id", "segment_id": 2006}},
            {"id": 216, "stock_title": "Tomatoes", "quantity": 10, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 2007}},
            {"id": 217, "stock_title": "Water Bottles", "quantity": 48, "unit": "pcs", "source_selector": {"mode": "segment_id", "segment_id": 2008}},
        ],
    },
    # Received (historical)
    {
        "id": 108, "type": "dispatch",
        "from_restaurant_id": 1, "to_restaurant_id": 781,
        "from_restaurant": {"restaurant_name": "My Genie", "restaurant_type": "master"},
        "to_restaurant":   {"restaurant_name": "DemoCentral1", "restaurant_type": "central"},
        "status": "received", "resolution_type": None,
        "requested_by": None, "requested_at": None,
        "approved_by": None, "approved_at": None,
        "dispatched_by": 4062, "dispatched_at": (now - timedelta(days=2)).isoformat(),
        "received_by": 4510, "received_at": (now - timedelta(days=2, hours=-4)).isoformat(),
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(days=2)).isoformat(),
        "updated_at": (now - timedelta(days=2, hours=-4)).isoformat(),
        "lines": [
            {"id": 218, "stock_title": "Basmati Rice", "quantity": 100, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 3001}},
            {"id": 219, "stock_title": "Flour (Atta)", "quantity": 75, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 3002}},
        ],
    },
    {
        "id": 109, "type": "request",
        "from_restaurant_id": 781, "to_restaurant_id": 783,
        "from_restaurant": {"restaurant_name": "DemoCentral1", "restaurant_type": "central"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise1", "restaurant_type": "franchise"},
        "status": "received", "resolution_type": None,
        "requested_by": 4520, "requested_at": (now - timedelta(days=3)).isoformat(),
        "approved_by": 4510, "approved_at": (now - timedelta(days=3, hours=-2)).isoformat(),
        "dispatched_by": 4510, "dispatched_at": (now - timedelta(days=3, hours=-4)).isoformat(),
        "received_by": 4520, "received_at": (now - timedelta(days=3, hours=-6)).isoformat(),
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(days=3)).isoformat(),
        "updated_at": (now - timedelta(days=3, hours=-6)).isoformat(),
        "lines": [
            {"id": 220, "stock_title": "Cooking Oil", "quantity": 10, "unit": "ltr", "source_selector": {"mode": "segment_id", "segment_id": 3003}},
            {"id": 221, "stock_title": "Onions", "quantity": 15, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 3004}},
            {"id": 222, "stock_title": "Tomatoes", "quantity": 12, "unit": "kg", "source_selector": {"mode": "segment_id", "segment_id": 3005}},
        ],
    },
    # Partially received
    {
        "id": 110, "type": "dispatch",
        "from_restaurant_id": 1, "to_restaurant_id": 782,
        "from_restaurant": {"restaurant_name": "My Genie", "restaurant_type": "master"},
        "to_restaurant":   {"restaurant_name": "DemoCentral2", "restaurant_type": "central"},
        "status": "partially_received", "resolution_type": "partial_return",
        "resolution_meta": {"reason": "3kg of Paneer spoiled in transit", "receive_totals": {"accepted_qty": 7, "rejected_qty": 3, "damaged_qty": 3, "returned_qty": 3}},
        "requested_by": None, "requested_at": None,
        "approved_by": None, "approved_at": None,
        "dispatched_by": 4062, "dispatched_at": (now - timedelta(days=1)).isoformat(),
        "received_by": 4515, "received_at": (now - timedelta(days=1, hours=-3)).isoformat(),
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(days=1)).isoformat(),
        "updated_at": (now - timedelta(days=1, hours=-3)).isoformat(),
        "lines": [
            {"id": 223, "stock_title": "Paneer", "quantity": 10, "unit": "kg", "accepted_qty": 7, "rejected_qty": 3, "resolution_type": "damaged", "source_selector": {"mode": "segment_id", "segment_id": 3006}},
        ],
    },
    # Cancelled
    {
        "id": 111, "type": "dispatch",
        "from_restaurant_id": 782, "to_restaurant_id": 785,
        "from_restaurant": {"restaurant_name": "DemoCentral2", "restaurant_type": "central"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise3", "restaurant_type": "franchise"},
        "status": "cancelled", "resolution_type": "return_to_source",
        "requested_by": None, "requested_at": None,
        "approved_by": None, "approved_at": None,
        "dispatched_by": 4515, "dispatched_at": (now - timedelta(days=4)).isoformat(),
        "received_by": None, "received_at": None,
        "cancelled_by": 4515, "cancelled_at": (now - timedelta(days=4, hours=-1)).isoformat(),
        "created_at": (now - timedelta(days=4)).isoformat(),
        "updated_at": (now - timedelta(days=4, hours=-1)).isoformat(),
        "lines": [
            {"id": 224, "stock_title": "Cream", "quantity": 5, "unit": "ltr", "source_selector": {"mode": "segment_id", "segment_id": 3007}},
        ],
    },
    # Rejected (pre-dispatch)
    {
        "id": 112, "type": "request",
        "from_restaurant_id": 781, "to_restaurant_id": 784,
        "from_restaurant": {"restaurant_name": "DemoCentral1", "restaurant_type": "central"},
        "to_restaurant":   {"restaurant_name": "DemoFranchise2", "restaurant_type": "franchise"},
        "status": "rejected", "resolution_type": None,
        "requested_by": 4525, "requested_at": (now - timedelta(days=5)).isoformat(),
        "approved_by": None, "approved_at": None,
        "dispatched_by": None, "dispatched_at": None,
        "received_by": None, "received_at": None,
        "cancelled_by": None, "cancelled_at": None,
        "created_at": (now - timedelta(days=5)).isoformat(),
        "updated_at": (now - timedelta(days=5, hours=-1)).isoformat(),
        "lines": [
            {"id": 225, "stock_title": "Cashew Nuts", "quantity": 10, "unit": "kg", "source_selector": None},
        ],
    },
]

TRANSFER_MAP = {t["id"]: t for t in TRANSFERS}


# ── Helper: get visible restaurants for a given actor ─────────────

def get_visible_restaurants(actor_restaurant_id):
    actor = RESTAURANTS.get(actor_restaurant_id)
    if not actor:
        return []
    rtype = actor["restaurant_type"]
    if rtype == "master":
        return [r for r in RESTAURANTS.values() if r["id"] != actor_restaurant_id]
    elif rtype == "central":
        result = []
        for r in RESTAURANTS.values():
            if r["id"] == actor_restaurant_id:
                continue
            if r["parent_restaurant_id"] == actor_restaurant_id:
                result.append(r)
            if r["restaurant_type"] == "central" and r["parent_restaurant_id"] == actor["parent_restaurant_id"]:
                result.append(r)
        seen = set()
        deduped = []
        for r in result:
            if r["id"] not in seen:
                seen.add(r["id"])
                deduped.append(r)
        return deduped
    else:
        return []


def get_children(restaurant_id):
    return [r for r in RESTAURANTS.values() if r["parent_restaurant_id"] == restaurant_id]


# ── Pending queues for a restaurant ───────────────────────────────

def get_pending_queues(actor_restaurant_id):
    actor = RESTAURANTS.get(actor_restaurant_id)
    if not actor:
        return {"approval_pending": [], "receive_pending": [], "my_requests": []}

    children_ids = [r["id"] for r in get_children(actor_restaurant_id)]
    approval_pending = []
    receive_pending = []
    my_requests = []

    for t in TRANSFERS:
        if t["status"] == "requested":
            if t["from_restaurant_id"] == actor_restaurant_id or t["from_restaurant_id"] in children_ids:
                approval_pending.append(t)
            if t["to_restaurant_id"] == actor_restaurant_id:
                my_requests.append(t)
        elif t["status"] == "dispatched":
            if t["to_restaurant_id"] == actor_restaurant_id:
                receive_pending.append(t)
        if t["status"] in ("requested", "approved", "dispatched"):
            if t["to_restaurant_id"] == actor_restaurant_id and t not in my_requests and t["type"] == "request":
                my_requests.append(t)

    return {
        "approval_pending": approval_pending,
        "receive_pending": receive_pending,
        "my_requests": my_requests,
    }


# ── Hierarchy summary ─────────────────────────────────────────────

def get_hierarchy_summary(actor_restaurant_id, store_type=None):
    visible = get_visible_restaurants(actor_restaurant_id)
    if store_type:
        visible = [r for r in visible if r["restaurant_type"] == store_type]

    stores = []
    for r in visible:
        txns = [t for t in TRANSFERS if t["from_restaurant_id"] == r["id"] or t["to_restaurant_id"] == r["id"]]
        sent = sum(sum(l.get("quantity", 0) for l in t["lines"]) for t in txns if t["from_restaurant_id"] == r["id"] and t["status"] in ("dispatched", "received", "partially_received"))
        recv = sum(sum(l.get("quantity", 0) for l in t["lines"]) for t in txns if t["to_restaurant_id"] == r["id"] and t["status"] in ("received", "partially_received"))
        stores.append({
            "restaurant_id": r["id"],
            "restaurant_name": r["name"],
            "restaurant_type": r["restaurant_type"],
            "sent_quantity": sent,
            "received_quantity": recv,
            "transaction_count": len(txns),
        })
    return {"stores": stores}


# ── Hierarchy detail ──────────────────────────────────────────────

def get_hierarchy_detail(actor_restaurant_id, store_restaurant_id=None, selected_stock_title=None, selected_unit_id=None):
    target_id = store_restaurant_id or actor_restaurant_id
    target = RESTAURANTS.get(target_id)
    if not target:
        return {}

    stock = _stock_for_store(target_id)
    batches = []
    parent_batches = []

    if selected_stock_title and selected_unit_id:
        batches = _batches_for_stock(target_id, selected_stock_title, selected_unit_id)
        if target.get("parent_restaurant_id"):
            parent_batches = _batches_for_stock(target["parent_restaurant_id"], selected_stock_title, selected_unit_id)

    visible = get_visible_restaurants(actor_restaurant_id)
    txns_raw = [t for t in TRANSFERS if t["from_restaurant_id"] == target_id or t["to_restaurant_id"] == target_id]
    transactions = []
    for t in txns_raw:
        for line in t["lines"]:
            transactions.append({
                "transfer_id": t["id"],
                "from_restaurant_name": t["from_restaurant"]["restaurant_name"],
                "from_restaurant_type": t["from_restaurant"]["restaurant_type"],
                "to_restaurant_name": t["to_restaurant"]["restaurant_name"],
                "to_restaurant_type": t["to_restaurant"]["restaurant_type"],
                "stock_title": line["stock_title"],
                "quantity": line["quantity"],
                "unit": line["unit"],
                "status": t["status"],
                "date": t["created_at"],
            })

    return {
        "store_restaurant_id": target_id,
        "store_restaurant_name": target["name"],
        "restaurant_type": target["restaurant_type"],
        "child_stock_summary": stock,
        "child_stock_batches": batches,
        "parent_stock_batches": parent_batches,
        "restaurants": [{"restaurant_id": r["id"], "restaurant_name": r["name"], "restaurant_type": r["restaurant_type"]} for r in visible],
        "transactions": transactions,
    }


# ── Transfer history ──────────────────────────────────────────────

def get_transfer_history(actor_restaurant_id):
    return [t for t in TRANSFERS if t["from_restaurant_id"] == actor_restaurant_id or t["to_restaurant_id"] == actor_restaurant_id]


def get_transfer_detail(transfer_id):
    return TRANSFER_MAP.get(transfer_id)
