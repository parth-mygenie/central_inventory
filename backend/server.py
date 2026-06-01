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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

PREPROD_V1 = os.environ.get('PREPROD_API_BASE_V1', 'https://preprod.mygenie.online/api/v1')
PREPROD_V2 = os.environ.get('PREPROD_API_BASE_V2', 'https://preprod.mygenie.online/api/v2/vendoremployee')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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


# ── Proxy: Auth (V1) — enriched with POS API profile context ──────
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

    token = data.get("token") or (data.get("data", {}) or {}).get("token")
    if not token:
        return JSONResponse(content=data, status_code=resp.status_code)

    # Fetch restaurant context from POS API profile
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            profile_resp = await http.get(
                f"{PREPROD_V1}/vendoremployee/profile",
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}",
                },
            )
        if profile_resp.status_code == 200:
            profile_data = profile_resp.json()
            restaurants = profile_data.get("restaurants", [])
            if restaurants and isinstance(restaurants, list) and len(restaurants) > 0:
                rest = restaurants[0]
                rid = rest.get("id")
                rname = rest.get("name")
                rtype = rest.get("restaurant_type_flag")
                parent_rid = rest.get("parent_restaurant_id")

                if rid and rtype:
                    data["restaurant_id"] = rid
                    data["restaurant_name"] = rname
                    data["restaurant_type_flag"] = rtype
                    data["parent_restaurant_id"] = parent_rid

                    await db.token_sessions.update_one(
                        {"token": token},
                        {"$set": {
                            "token": token,
                            "restaurant_id": rid,
                            "restaurant_type_flag": rtype,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        }},
                        upsert=True,
                    )
                    logger.info(f"POS profile context resolved for {email}: rid={rid}, type={rtype}")
    except Exception as e:
        logger.warning(f"POS profile call failed for {email}: {e}")

    # No seed fallback — if POS profile fails, frontend fail-closed handles it
    return JSONResponse(content=data, status_code=resp.status_code)


# ── Generic proxy for ALL V2 endpoints (real POS API pass-through) ─
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
        if method in ("post", "put", "delete"):
            try:
                body = await request.json()
            except Exception:
                body = None

        kwargs = {"headers": headers}
        if method in ("post", "put", "patch") and body is not None:
            kwargs["json"] = body
        if method == "delete" and body is not None:
            # httpx.delete() doesn't support json/content — use generic request()
            resp = await http.request("DELETE", target_url, json=body, headers=headers)
        else:
            resp = await getattr(http, method)(target_url, **kwargs)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
