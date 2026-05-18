from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Existing Models ---

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# --- API Verification Models ---

class ProxyRequest(BaseModel):
    url: str
    method: str = "GET"
    headers: Optional[Dict[str, str]] = None
    body: Optional[Any] = None
    timeout: Optional[int] = 30

class ProxyResponse(BaseModel):
    status_code: int
    headers: Dict[str, str]
    body: Any
    elapsed_ms: float
    error: Optional[str] = None

class VerificationRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    api_name: str
    workflow: str
    endpoint: str
    method: str
    request_payload: Optional[Any] = None
    request_headers: Optional[Dict[str, str]] = None
    response_status: Optional[int] = None
    response_body: Optional[Any] = None
    elapsed_ms: Optional[float] = None
    status: str = "not_tested"
    terminology_flags: Optional[List[str]] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VerificationCreate(BaseModel):
    api_name: str
    workflow: str
    endpoint: str
    method: str
    request_payload: Optional[Any] = None
    request_headers: Optional[Dict[str, str]] = None
    response_status: Optional[int] = None
    response_body: Optional[Any] = None
    elapsed_ms: Optional[float] = None
    status: str = "not_tested"
    terminology_flags: Optional[List[str]] = None
    notes: Optional[str] = None

class VerificationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    terminology_flags: Optional[List[str]] = None
    response_status: Optional[int] = None
    response_body: Optional[Any] = None
    elapsed_ms: Optional[float] = None
    request_payload: Optional[Any] = None
    request_headers: Optional[Dict[str, str]] = None

# --- Existing Routes ---

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

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

# --- API Proxy Route ---

@api_router.post("/proxy", response_model=ProxyResponse)
async def proxy_api_request(req: ProxyRequest):
    try:
        async with httpx.AsyncClient(timeout=req.timeout, verify=False) as hc:
            import time
            start = time.monotonic()
            resp = await hc.request(
                method=req.method.upper(),
                url=req.url,
                headers=req.headers or {},
                json=req.body if req.body and req.method.upper() != "GET" else None,
                params=req.body if req.body and req.method.upper() == "GET" else None,
            )
            elapsed = (time.monotonic() - start) * 1000

            try:
                resp_body = resp.json()
            except Exception:
                resp_body = resp.text

            resp_headers = dict(resp.headers)

            return ProxyResponse(
                status_code=resp.status_code,
                headers=resp_headers,
                body=resp_body,
                elapsed_ms=round(elapsed, 2),
            )
    except httpx.TimeoutException:
        return ProxyResponse(
            status_code=0,
            headers={},
            body=None,
            elapsed_ms=0,
            error="Request timed out",
        )
    except Exception as e:
        return ProxyResponse(
            status_code=0,
            headers={},
            body=None,
            elapsed_ms=0,
            error=str(e),
        )

# --- Verification CRUD Routes ---

@api_router.post("/verifications", response_model=VerificationRecord)
async def create_verification(input: VerificationCreate):
    record = VerificationRecord(**input.model_dump())
    doc = record.model_dump()
    await db.api_verifications.insert_one(doc)
    return record

@api_router.get("/verifications", response_model=List[VerificationRecord])
async def get_verifications():
    records = await db.api_verifications.find({}, {"_id": 0}).to_list(500)
    return records

@api_router.put("/verifications/{record_id}")
async def update_verification(record_id: str, input: VerificationUpdate):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.api_verifications.update_one(
        {"id": record_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    updated = await db.api_verifications.find_one({"id": record_id}, {"_id": 0})
    return updated

@api_router.delete("/verifications/{record_id}")
async def delete_verification(record_id: str):
    result = await db.api_verifications.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": True}

@api_router.get("/api-catalog")
async def get_api_catalog():
    return API_CATALOG

# --- Pre-configured API Catalog ---

API_CATALOG = [
    {
        "group": "Hierarchy & Reporting",
        "apis": [
            {
                "name": "Hierarchy Summary",
                "workflow": "Store list + activity metrics",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/hierarchy-summary",
                "method": "POST",
                "sample_body": {"store_type": "franchise"},
                "terminology_risk": "HIGH",
                "notes": "store_type 'central' = Business Master, 'franchise' = Business Outlet"
            },
            {
                "name": "Hierarchy Detail",
                "workflow": "Store stock + batches + transactions",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/hierarchy-detail",
                "method": "POST",
                "sample_body": {"store_restaurant_id": "REPLACE"},
                "terminology_risk": "HIGH",
                "notes": "restaurant_type in response needs mapping"
            },
            {
                "name": "Hierarchy Report (Alias)",
                "workflow": "Backward-compat alias for detail",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/hierarchy-report",
                "method": "POST",
                "sample_body": {"store_restaurant_id": "REPLACE"},
                "terminology_risk": "HIGH",
                "notes": "Deprecated for new UI; use hierarchy-detail"
            }
        ]
    },
    {
        "group": "Transfer Flow",
        "apis": [
            {
                "name": "Direct Dispatch (Initiate)",
                "workflow": "Parent dispatches stock to child",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/initiate",
                "method": "POST",
                "sample_body": {
                    "from_restaurant_id": "REPLACE",
                    "to_restaurant_id": "REPLACE",
                    "items": [{"source_inventory_master_id": 1, "quantity": 2, "unit": "kg", "source_selector": {"mode": "filter_bucket", "bucket": "without_batch_and_expiry", "batch_state": "null", "expiry_state": "null"}}]
                },
                "terminology_risk": "HIGH",
                "notes": "from_restaurant_id (backend master) = Business Central"
            },
            {
                "name": "Request Stock",
                "workflow": "Child requests stock from parent",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/request",
                "method": "POST",
                "sample_body": {
                    "items": [{"stock_title": "Tomato", "unit_id": 1, "quantity": 5, "unit": "kg", "source_selector": {"mode": "filter_bucket", "bucket": "without_batch_and_expiry", "batch_state": "null", "expiry_state": "null"}}]
                },
                "terminology_risk": "LOW",
                "notes": "Parent auto-resolved from caller's parent_restaurant_id"
            },
            {
                "name": "Approve Transfer",
                "workflow": "Parent approves child request",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/approve/{id}",
                "method": "POST",
                "sample_body": {},
                "terminology_risk": "LOW",
                "notes": "Replace {id} with transfer ID"
            },
            {
                "name": "Dispatch Approved",
                "workflow": "Dispatch after approval",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/dispatch/{id}",
                "method": "POST",
                "sample_body": {},
                "terminology_risk": "LOW",
                "notes": "Replace {id} with transfer ID"
            },
            {
                "name": "Receive Stock",
                "workflow": "Destination confirms receipt",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/receive/{id}",
                "method": "POST",
                "sample_body": {},
                "terminology_risk": "LOW",
                "notes": "Omit received_lines for full receive"
            },
            {
                "name": "Partial Receive",
                "workflow": "Partial accept + reject per line",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/receive/{id}",
                "method": "POST",
                "sample_body": {
                    "resolution_type": "return_to_source",
                    "received_lines": [{"line_id": 0, "accepted_qty": 8, "rejected_qty": 2}]
                },
                "terminology_risk": "LOW",
                "notes": "accepted_qty + rejected_qty must equal requested_qty per line"
            },
            {
                "name": "Cancel Transfer",
                "workflow": "Source cancels dispatched transfer",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/cancel/{id}",
                "method": "POST",
                "sample_body": {},
                "terminology_risk": "LOW",
                "notes": "Only source can cancel dispatched transfers"
            },
            {
                "name": "Reject Transfer",
                "workflow": "Pre/post-dispatch rejection",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/reject/{id}",
                "method": "POST",
                "sample_body": {"resolution_type": "return_to_source", "resolution_meta": {"reason": ""}},
                "terminology_risk": "LOW",
                "notes": "Pre-dispatch: source rejects. Post-dispatch: destination rejects."
            },
            {
                "name": "Edit Transfer",
                "workflow": "Edit pre-dispatch request",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/edit/{id}",
                "method": "POST",
                "sample_body": {"items": []},
                "terminology_risk": "LOW",
                "notes": "Resets status to 'requested' (forces re-approval)"
            }
        ]
    },
    {
        "group": "Stock & Source",
        "apis": [
            {
                "name": "Source Options",
                "workflow": "Get source segments for dispatch",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/source-options",
                "method": "POST",
                "sample_body": {"from_restaurant_id": "REPLACE", "source_inventory_master_id": 0},
                "terminology_risk": "MEDIUM",
                "notes": "from_restaurant_id uses backend restaurant type"
            },
            {
                "name": "Add Stock",
                "workflow": "Add stock with batch/expiry",
                "endpoint": "/api/v2/vendoremployee/inventory/add-stock/{id}",
                "method": "POST",
                "sample_body": {"quantity": 10, "unit": "kg", "vendor_id": 1, "payment_type": "Cash", "purchase_date": "2026-01-01", "price": 100, "tot_amount": 100},
                "terminology_risk": "LOW",
                "notes": "Replace {id} with inventory_master_id"
            }
        ]
    },
    {
        "group": "Queues & History",
        "apis": [
            {
                "name": "Pending Queues",
                "workflow": "Get pending actions (approve/receive/requests)",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/pending-queues",
                "method": "POST",
                "sample_body": {"limit": 50},
                "terminology_risk": "LOW",
                "notes": "Scoped to authenticated restaurant"
            },
            {
                "name": "Transfer Details",
                "workflow": "Get single transfer detail",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/details/{id}",
                "method": "GET",
                "sample_body": None,
                "terminology_risk": "HIGH",
                "notes": "Response contains from/to restaurant_type — needs mapping"
            },
            {
                "name": "Transfer History",
                "workflow": "List transfers with filters",
                "endpoint": "/api/v2/vendoremployee/inventory-transfer/history",
                "method": "POST",
                "sample_body": {"limit": 20},
                "terminology_risk": "MEDIUM",
                "notes": "restaurant_type may appear in results"
            }
        ]
    },
    {
        "group": "Auth",
        "apis": [
            {
                "name": "Vendor Employee Login",
                "workflow": "Authenticate vendor employee",
                "endpoint": "/api/v1/auth/vendoremployee/common-login",
                "method": "POST",
                "sample_body": {"email": "", "password": "", "fcm_token": "test"},
                "terminology_risk": "LOW",
                "notes": "Returns Bearer token for subsequent API calls"
            }
        ]
    },
    {
        "group": "Franchise",
        "apis": [
            {
                "name": "Franchise List",
                "workflow": "List franchise outlets",
                "endpoint": "/api/v2/vendoremployee/franchise/list",
                "method": "GET",
                "sample_body": None,
                "terminology_risk": "HIGH",
                "notes": "franchise = Business Outlet"
            },
            {
                "name": "Franchise Push",
                "workflow": "Push menu/recipe to franchise",
                "endpoint": "/api/v2/vendoremployee/franchise/push/{id}",
                "method": "POST",
                "sample_body": {"push_food_bundle": True},
                "terminology_risk": "HIGH",
                "notes": "franchise = Business Outlet"
            }
        ]
    }
]

# --- Include router & middleware ---

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
