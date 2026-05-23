from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

import seed_data

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

PREPROD_V1 = os.environ.get('PREPROD_API_BASE_V1', 'https://preprod.mygenie.online/api/v1')
PREPROD_V2 = os.environ.get('PREPROD_API_BASE_V2', 'https://preprod.mygenie.online/api/v2/vendoremployee')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ── In-memory session: email → restaurant_id mapping ──────────────
_token_restaurant_map = {}

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Central Inventory API Proxy"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ── Proxy: Auth (V1) — enriched with restaurant_type_flag ─────────
@api_router.post("/proxy/auth/login")
async def proxy_auth_login(request: Request):
    body = await request.json()
    email = body.get("email", "")

    async with httpx.AsyncClient(timeout=30.0) as http:
        resp = await http.post(
            f"{PREPROD_V1}/auth/vendoremployee/common-login",
            json=body,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )

    data = resp.json()

    # Enrich: if login succeeded but restaurant_type_flag is missing, derive from seed data
    token = data.get("token") or (data.get("data", {}) or {}).get("token")
    if token and email in seed_data.EMAIL_RESTAURANT_MAP:
        rid = seed_data.EMAIL_RESTAURANT_MAP[email]
        rest = seed_data.RESTAURANTS.get(rid, {})
        # Store token→restaurant mapping for later proxy calls
        _token_restaurant_map[token] = rid

        if not data.get("restaurant_type_flag"):
            data["restaurant_type_flag"] = rest.get("restaurant_type_flag")
        if not data.get("restaurant_id"):
            data["restaurant_id"] = rid
        if not data.get("restaurant_name"):
            data["restaurant_name"] = rest.get("name")

    return JSONResponse(content=data, status_code=resp.status_code)


def _get_actor_restaurant(request: Request):
    """Resolve restaurant_id from token."""
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip() if auth.startswith("Bearer") else ""
    return _token_restaurant_map.get(token, 1)


# ── Seed-enriched endpoints ───────────────────────────────────────

@api_router.post("/proxy/v2/inventory-transfer/hierarchy-summary")
async def proxy_hierarchy_summary(request: Request):
    body = await request.json()
    actor_id = _get_actor_restaurant(request)
    store_type = body.get("store_type")

    # Try real API first
    auth_header = request.headers.get("Authorization", "")
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header

    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.post(f"{PREPROD_V2}/inventory-transfer/hierarchy-summary", json=body, headers=headers)
        real_data = resp.json()
        real_stores = (real_data.get("data", {}) or {}).get("stores", [])
    except Exception:
        real_stores = []

    # Merge: use seed data to enrich with transfer counts
    seed = seed_data.get_hierarchy_summary(actor_id, store_type)
    seed_stores = seed.get("stores", [])

    # Build map of real stores by id
    real_map = {s["restaurant_id"]: s for s in real_stores}

    merged = []
    seen = set()
    for ss in seed_stores:
        rid = ss["restaurant_id"]
        seen.add(rid)
        rs = real_map.get(rid, {})
        merged.append({
            "restaurant_id": rid,
            "restaurant_name": ss["restaurant_name"],
            "restaurant_type": ss["restaurant_type"],
            "sent_quantity": ss["sent_quantity"] or rs.get("sent_quantity", 0),
            "received_quantity": ss["received_quantity"] or rs.get("received_quantity", 0),
            "transaction_count": ss["transaction_count"] or rs.get("transaction_count", 0),
        })
    for rs in real_stores:
        if rs["restaurant_id"] not in seen:
            merged.append(rs)

    return JSONResponse(content={"data": {"stores": merged}})


@api_router.post("/proxy/v2/inventory-transfer/hierarchy-detail")
async def proxy_hierarchy_detail(request: Request):
    body = await request.json()
    actor_id = _get_actor_restaurant(request)
    store_id = body.get("store_restaurant_id")
    sel_stock = body.get("selected_stock_title")
    sel_unit = body.get("selected_unit_id")

    detail = seed_data.get_hierarchy_detail(actor_id, store_id, sel_stock, sel_unit)
    return JSONResponse(content={"data": detail})


@api_router.post("/proxy/v2/inventory-transfer/pending-queues")
async def proxy_pending_queues(request: Request):
    actor_id = _get_actor_restaurant(request)
    queues = seed_data.get_pending_queues(actor_id)

    # Serialize — strip heavy fields for queue list view
    def slim(t):
        return {
            "id": t["id"],
            "transfer_id": t["id"],
            "type": t["type"],
            "status": t["status"],
            "from_restaurant_id": t["from_restaurant_id"],
            "to_restaurant_id": t["to_restaurant_id"],
            "from_restaurant_name": t["from_restaurant"]["restaurant_name"],
            "from_restaurant_type": t["from_restaurant"]["restaurant_type"],
            "to_restaurant_name": t["to_restaurant"]["restaurant_name"],
            "to_restaurant_type": t["to_restaurant"]["restaurant_type"],
            "created_at": t["created_at"],
            "items_count": len(t["lines"]),
        }

    return JSONResponse(content={"data": {
        "approval_pending": [slim(t) for t in queues["approval_pending"]],
        "receive_pending": [slim(t) for t in queues["receive_pending"]],
        "my_requests": [slim(t) for t in queues["my_requests"]],
    }})


@api_router.get("/proxy/v2/inventory-transfer/details/{transfer_id}")
async def proxy_transfer_detail(transfer_id: int, request: Request):
    detail = seed_data.get_transfer_detail(transfer_id)
    if detail:
        return JSONResponse(content={"status": True, "data": detail})

    # Fallback to real API
    auth_header = request.headers.get("Authorization", "")
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(f"{PREPROD_V2}/inventory-transfer/details/{transfer_id}", headers=headers)
        return JSONResponse(content=resp.json(), status_code=resp.status_code)
    except Exception:
        return JSONResponse(content={"error": "Transfer not found"}, status_code=404)


@api_router.post("/proxy/v2/inventory-transfer/history")
async def proxy_transfer_history(request: Request):
    actor_id = _get_actor_restaurant(request)
    history = seed_data.get_transfer_history(actor_id)

    items = []
    for t in history:
        items.append({
            "id": t["id"],
            "type": t["type"],
            "status": t["status"],
            "from_restaurant_id": t["from_restaurant_id"],
            "to_restaurant_id": t["to_restaurant_id"],
            "from_restaurant_name": t["from_restaurant"]["restaurant_name"],
            "to_restaurant_name": t["to_restaurant"]["restaurant_name"],
            "created_at": t["created_at"],
            "updated_at": t["updated_at"],
            "items_count": len(t["lines"]),
        })

    return JSONResponse(content={"data": items, "meta": {"total": len(items), "page": 1}})


# ── Generic proxy for other V2 endpoints ──────────────────────────
@api_router.api_route("/proxy/v2/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_v2(path: str, request: Request):
    auth_header = request.headers.get("Authorization", "")
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header

    target_url = f"{PREPROD_V2}/{path}"
    query_string = str(request.query_params)
    if query_string:
        target_url += f"?{query_string}"

    async with httpx.AsyncClient(timeout=30.0) as http:
        method = request.method.lower()
        body = None
        if method in ("post", "put"):
            try:
                body = await request.json()
            except Exception:
                body = None

        resp = await getattr(http, method)(
            target_url,
            json=body if body else None,
            headers=headers,
        )

    try:
        content = resp.json()
    except Exception:
        content = {"raw": resp.text}

    return JSONResponse(content=content, status_code=resp.status_code)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
