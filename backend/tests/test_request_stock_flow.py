"""
Test Request Stock 3-Step Flow APIs
Tests the canonical request-sources → request-catalog → request flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FRANCHISE_USER = {"email": "owner@demofranchise4.com", "password": "Qplazm@10"}
CENTRAL_USER = {"email": "owner@democentral1.com", "password": "Qplazm@10"}


@pytest.fixture(scope="module")
def franchise_token():
    """Get token for franchise user (rid=786, type=franchise, parent=C782)"""
    resp = requests.post(
        f"{BASE_URL}/api/proxy/auth/login",
        json={**FRANCHISE_USER, "fcm_token": "test"},
        headers={"Content-Type": "application/json"}
    )
    assert resp.status_code == 200, f"Franchise login failed: {resp.text}"
    data = resp.json()
    token = data.get("token")
    assert token, "No token in franchise login response"
    return token


@pytest.fixture(scope="module")
def central_token():
    """Get token for central user (rid=781, type=central)"""
    resp = requests.post(
        f"{BASE_URL}/api/proxy/auth/login",
        json={**CENTRAL_USER, "fcm_token": "test"},
        headers={"Content-Type": "application/json"}
    )
    assert resp.status_code == 200, f"Central login failed: {resp.text}"
    data = resp.json()
    token = data.get("token")
    assert token, "No token in central login response"
    return token


class TestRequestSources:
    """Step 1: POST /request-sources - get available sources for stock requests"""

    def test_franchise_user_sees_3_sources(self, franchise_token):
        """Franchise user should see: parent (C782), upstream master (1), sibling (C781)"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            json={},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {franchise_token}"
            }
        )
        assert resp.status_code == 200, f"request-sources failed: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert data.get("status") == True
        assert "data" in data
        sources = data["data"].get("sources", [])
        
        # Franchise user should see 3 sources
        assert len(sources) == 3, f"Expected 3 sources, got {len(sources)}"
        
        # Verify source properties
        for src in sources:
            assert "restaurant_id" in src
            assert "name" in src
            assert "relation" in src
            assert "can_submit_request" in src
        
        # Verify relations
        relations = [s["relation"] for s in sources]
        assert "direct_parent" in relations, "Missing direct_parent source"
        assert "upstream_master" in relations, "Missing upstream_master source"
        assert "sibling_central" in relations, "Missing sibling_central source"
        
        # Verify direct_parent has is_direct_parent=true
        parent = next((s for s in sources if s["relation"] == "direct_parent"), None)
        assert parent is not None
        assert parent.get("is_direct_parent") == True
        assert parent.get("can_submit_request") == True

    def test_central_user_sees_2_sources(self, central_token):
        """Central user should see: parent master (1), sibling central (C782)"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            json={},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {central_token}"
            }
        )
        assert resp.status_code == 200, f"request-sources failed: {resp.text}"
        data = resp.json()
        
        sources = data["data"].get("sources", [])
        
        # Central user should see 2 sources
        assert len(sources) == 2, f"Expected 2 sources, got {len(sources)}"
        
        # Verify relations
        relations = [s["relation"] for s in sources]
        assert "direct_parent" in relations, "Missing direct_parent (master) source"
        assert "sibling_central" in relations, "Missing sibling_central source"

    def test_sibling_central_blocked_indicator(self, central_token):
        """Sibling central with cross-flag OFF should show can_submit_request=false"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            json={},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {central_token}"
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        sources = data["data"].get("sources", [])
        
        sibling = next((s for s in sources if s["relation"] == "sibling_central"), None)
        assert sibling is not None, "No sibling_central source found"
        
        # Sibling central should have can_submit_request=false (cross-branch disabled)
        assert sibling.get("can_submit_request") == False, \
            f"Expected sibling can_submit_request=false, got {sibling.get('can_submit_request')}"


class TestRequestCatalog:
    """Step 2: POST /request-catalog - get items from source store"""

    def test_catalog_returns_items_with_source_inventory_master_id(self, franchise_token):
        """Catalog should return items with source_inventory_master_id, stock_title, unit, available_display_qty"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            json={"source_restaurant_id": 782},  # DemoCentral2 (parent)
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {franchise_token}"
            }
        )
        assert resp.status_code == 200, f"request-catalog failed: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert data.get("status") == True
        assert "data" in data
        items = data["data"].get("items", [])
        
        assert len(items) > 0, "No items returned from catalog"
        
        # Verify item properties
        for item in items:
            assert "source_inventory_master_id" in item, "Missing source_inventory_master_id"
            assert "stock_title" in item, "Missing stock_title"
            assert "unit" in item, "Missing unit"
            assert "available_display_qty" in item, "Missing available_display_qty"
        
        # Verify source_restaurant info
        source_restaurant = data["data"].get("source_restaurant")
        assert source_restaurant is not None
        assert source_restaurant.get("restaurant_id") == 782

    def test_catalog_from_different_source(self, franchise_token):
        """Test catalog from upstream master (rid=1)"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            json={"source_restaurant_id": 1},  # Master
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {franchise_token}"
            }
        )
        assert resp.status_code == 200, f"request-catalog failed: {resp.text}"
        data = resp.json()
        
        items = data["data"].get("items", [])
        assert len(items) > 0, "No items from master catalog"


class TestRequestSubmit:
    """Step 3: POST /request - submit stock request"""

    def test_submit_request_with_valid_source_inventory_master_id(self, franchise_token):
        """Submit request with valid source_inventory_master_id creates transfer"""
        # First get catalog to get valid source_inventory_master_id
        catalog_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            json={"source_restaurant_id": 782},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {franchise_token}"
            }
        )
        assert catalog_resp.status_code == 200
        items = catalog_resp.json()["data"]["items"]
        assert len(items) > 0
        
        item = items[0]
        
        # Submit request
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request",
            json={
                "items": [{
                    "source_inventory_master_id": item["source_inventory_master_id"],
                    "stock_title": item["stock_title"],
                    "unit_id": item.get("unit_id", 1),
                    "quantity": 0.1,
                    "unit": item["unit"],
                    "source_selector": {
                        "mode": "filter_bucket",
                        "bucket": "without_batch_and_expiry",
                        "batch_state": "null",
                        "expiry_state": "null"
                    }
                }]
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {franchise_token}"
            }
        )
        assert resp.status_code == 200, f"request submit failed: {resp.text}"
        data = resp.json()
        
        # Verify response
        assert data.get("status") == True
        assert "data" in data
        assert "transfer_id" in data["data"], "No transfer_id in response"
        assert data["data"].get("type") == "request"
        assert data["data"].get("status") == "requested"

    def test_submit_request_with_wrong_source_inventory_master_id_returns_422(self, franchise_token):
        """Submit with wrong source_inventory_master_id returns 422 SOURCE_STOCK_NOT_FOUND"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request",
            json={
                "items": [{
                    "source_inventory_master_id": 99999,  # Invalid ID
                    "stock_title": "Fake Item",
                    "unit_id": 1,
                    "quantity": 1,
                    "unit": "kg",
                    "source_selector": {
                        "mode": "filter_bucket",
                        "bucket": "without_batch_and_expiry",
                        "batch_state": "null",
                        "expiry_state": "null"
                    }
                }]
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {franchise_token}"
            }
        )
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        data = resp.json()
        
        assert data.get("status") == False
        assert data.get("error_code") == "SOURCE_STOCK_NOT_FOUND"


class TestPendingQueues:
    """Verify my_requests shows submitted requests"""

    def test_pending_queues_shows_my_requests(self, franchise_token):
        """After submit, pending-queues should show request in my_requests"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/pending-queues",
            json={},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {franchise_token}"
            }
        )
        assert resp.status_code == 200, f"pending-queues failed: {resp.text}"
        data = resp.json()
        
        assert data.get("status") == True
        assert "data" in data
        
        my_requests = data["data"].get("my_requests", [])
        assert len(my_requests) > 0, "No requests in my_requests queue"
        
        # Verify at least one request type transfer
        request_transfers = [r for r in my_requests if r.get("type") == "request"]
        assert len(request_transfers) > 0, "No request-type transfers in my_requests"


class TestLoginContext:
    """Verify login returns correct restaurant context"""

    def test_franchise_login_returns_context(self):
        """Franchise login should return restaurant_id, restaurant_type_flag, parent_restaurant_id"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={**FRANCHISE_USER, "fcm_token": "test"},
            headers={"Content-Type": "application/json"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("restaurant_id") == 786
        assert data.get("restaurant_type_flag") == "franchise"
        assert data.get("parent_restaurant_id") == 782
        assert data.get("restaurant_name") == "DemoFranchise4"

    def test_central_login_returns_context(self):
        """Central login should return restaurant_id, restaurant_type_flag"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={**CENTRAL_USER, "fcm_token": "test"},
            headers={"Content-Type": "application/json"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("restaurant_id") == 781
        assert data.get("restaurant_type_flag") == "central"
        assert data.get("parent_restaurant_id") == 1
