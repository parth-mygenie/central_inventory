"""
P12/P14 Contract Tests - Request Stock without source_selector

Key contract changes:
- POST /request WITHOUT source_selector creates transfer (status=requested)
- POST /approve/{id} succeeds on no-selector request
- POST /dispatch/{id} with empty body uses auto-FEFO on no-selector request
- Full lifecycle request→approve→dispatch succeeds without source_selector
- POST /request WITH optional source_selector still accepted (backward compat)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment (never hardcode secrets)
FRANCHISE_EMAIL = os.environ.get('TEST_FRANCHISE_EMAIL', 'owner@demofranchise4.com')
FRANCHISE_PASSWORD = os.environ.get('TEST_PASSWORD', '')
CENTRAL_EMAIL = os.environ.get('TEST_CENTRAL_EMAIL', 'owner@democentral2.com')
CENTRAL_PASSWORD = os.environ.get('TEST_PASSWORD', '')


class TestP12P14Contract:
    """Tests for P12/P14 source_selector ownership contract"""
    
    @pytest.fixture(scope="class")
    def franchise_token(self):
        """Get franchise user token (requester)"""
        resp = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": FRANCHISE_EMAIL,
            "password": FRANCHISE_PASSWORD,
            "fcm_token": "test"
        })
        assert resp.status_code == 200, f"Franchise login failed: {resp.text}"
        data = resp.json()
        token = data.get("token") or data.get("data", {}).get("token")
        assert token, "No token in franchise login response"
        return token
    
    @pytest.fixture(scope="class")
    def central_token(self):
        """Get central user token (sender/approver)"""
        resp = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": CENTRAL_EMAIL,
            "password": CENTRAL_PASSWORD,
            "fcm_token": "test"
        })
        assert resp.status_code == 200, f"Central login failed: {resp.text}"
        data = resp.json()
        token = data.get("token") or data.get("data", {}).get("token")
        assert token, "No token in central login response"
        return token
    
    def test_01_request_sources_returns_sources(self, franchise_token):
        """Test request-sources returns sources with can_submit_request"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={}
        )
        assert resp.status_code == 200, f"request-sources failed: {resp.text}"
        data = resp.json().get("data", resp.json())
        sources = data.get("sources", [])
        assert len(sources) > 0, "No sources returned"
        
        # Verify source structure
        for src in sources:
            assert "restaurant_id" in src, "Missing restaurant_id in source"
            assert "name" in src, "Missing name in source"
            assert "can_submit_request" in src, "Missing can_submit_request in source"
            assert "relation" in src, "Missing relation in source"
        
        print(f"PASS: request-sources returned {len(sources)} sources")
    
    def test_02_request_catalog_returns_items(self, franchise_token):
        """Test request-catalog returns items with source_inventory_master_id"""
        # First get sources
        sources_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={}
        )
        sources = sources_resp.json().get("data", sources_resp.json()).get("sources", [])
        assert len(sources) > 0, "No sources to test catalog"
        
        source_id = sources[0]["restaurant_id"]
        
        # Get catalog
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={"source_restaurant_id": source_id}
        )
        assert resp.status_code == 200, f"request-catalog failed: {resp.text}"
        data = resp.json().get("data", resp.json())
        items = data.get("items", [])
        
        # Verify item structure
        for item in items:
            assert "source_inventory_master_id" in item, "Missing source_inventory_master_id"
            assert "stock_title" in item, "Missing stock_title"
        
        print(f"PASS: request-catalog returned {len(items)} items from source {source_id}")
        return items
    
    def test_03_request_without_source_selector_succeeds(self, franchise_token):
        """P12 Contract: POST /request WITHOUT source_selector creates transfer"""
        # Get sources and catalog
        sources_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={}
        )
        sources = sources_resp.json().get("data", sources_resp.json()).get("sources", [])
        source_id = sources[0]["restaurant_id"]
        
        catalog_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={"source_restaurant_id": source_id}
        )
        items = catalog_resp.json().get("data", catalog_resp.json()).get("items", [])
        assert len(items) > 0, "No items in catalog"
        
        # Submit request WITHOUT source_selector (P12 contract)
        item = items[0]
        payload = {
            "items": [{
                "source_inventory_master_id": item["source_inventory_master_id"],
                "stock_title": item["stock_title"],
                "quantity": 0.1,
                "unit": item.get("unit") or item.get("display_unit", "kg")
                # NO source_selector - this is the P12 contract
            }]
        }
        
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json=payload
        )
        
        assert resp.status_code == 200, f"Request without source_selector failed: {resp.text}"
        data = resp.json().get("data", resp.json())
        transfer_id = data.get("transfer_id") or data.get("id")
        assert transfer_id, f"No transfer_id in response: {data}"
        
        print(f"PASS: Request without source_selector created transfer {transfer_id}")
        return transfer_id
    
    def test_04_request_with_source_selector_backward_compat(self, franchise_token):
        """Backward compat: POST /request WITH source_selector still accepted"""
        # Get sources and catalog
        sources_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={}
        )
        sources = sources_resp.json().get("data", sources_resp.json()).get("sources", [])
        source_id = sources[0]["restaurant_id"]
        
        catalog_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={"source_restaurant_id": source_id}
        )
        items = catalog_resp.json().get("data", catalog_resp.json()).get("items", [])
        assert len(items) > 0, "No items in catalog"
        
        # Submit request WITH source_selector (backward compat)
        item = items[0]
        payload = {
            "items": [{
                "source_inventory_master_id": item["source_inventory_master_id"],
                "stock_title": item["stock_title"],
                "quantity": 0.1,
                "unit": item.get("unit") or item.get("display_unit", "kg"),
                "source_selector": {
                    "mode": "filter_bucket",
                    "bucket": "without_batch_and_expiry",
                    "batch_state": "null",
                    "expiry_state": "null"
                }
            }]
        }
        
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json=payload
        )
        
        assert resp.status_code == 200, f"Request with source_selector failed: {resp.text}"
        data = resp.json().get("data", resp.json())
        transfer_id = data.get("transfer_id") or data.get("id")
        assert transfer_id, f"No transfer_id in response: {data}"
        
        print(f"PASS: Request with source_selector (backward compat) created transfer {transfer_id}")
    
    def test_05_approve_no_selector_request_succeeds(self, franchise_token, central_token):
        """P12 Contract: POST /approve/{id} succeeds on no-selector request"""
        # Create request without selector
        sources_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={}
        )
        sources = sources_resp.json().get("data", sources_resp.json()).get("sources", [])
        source_id = sources[0]["restaurant_id"]
        
        catalog_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={"source_restaurant_id": source_id}
        )
        items = catalog_resp.json().get("data", catalog_resp.json()).get("items", [])
        item = items[0]
        
        # Create request without source_selector
        req_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={
                "items": [{
                    "source_inventory_master_id": item["source_inventory_master_id"],
                    "stock_title": item["stock_title"],
                    "quantity": 0.1,
                    "unit": item.get("unit") or item.get("display_unit", "kg")
                }]
            }
        )
        assert req_resp.status_code == 200, f"Request creation failed: {req_resp.text}"
        transfer_id = req_resp.json().get("data", req_resp.json()).get("transfer_id")
        
        # Approve as central user
        approve_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/approve/{transfer_id}",
            headers={"Authorization": f"Bearer {central_token}"},
            json={}
        )
        
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        print(f"PASS: Approve on no-selector request {transfer_id} succeeded")
        return transfer_id
    
    def test_06_dispatch_auto_fefo_on_no_selector_request(self, franchise_token, central_token):
        """P14 Contract: POST /dispatch/{id} with empty body uses auto-FEFO"""
        # Create and approve request without selector
        sources_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={}
        )
        sources = sources_resp.json().get("data", sources_resp.json()).get("sources", [])
        source_id = sources[0]["restaurant_id"]
        
        catalog_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={"source_restaurant_id": source_id}
        )
        items = catalog_resp.json().get("data", catalog_resp.json()).get("items", [])
        item = items[0]
        
        # Create request without source_selector
        req_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={
                "items": [{
                    "source_inventory_master_id": item["source_inventory_master_id"],
                    "stock_title": item["stock_title"],
                    "quantity": 0.1,
                    "unit": item.get("unit") or item.get("display_unit", "kg")
                }]
            }
        )
        transfer_id = req_resp.json().get("data", req_resp.json()).get("transfer_id")
        
        # Approve
        requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/approve/{transfer_id}",
            headers={"Authorization": f"Bearer {central_token}"},
            json={}
        )
        
        # Dispatch with empty body (auto-FEFO per P14)
        dispatch_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/dispatch/{transfer_id}",
            headers={"Authorization": f"Bearer {central_token}"},
            json={}
        )
        
        assert dispatch_resp.status_code == 200, f"Dispatch with auto-FEFO failed: {dispatch_resp.text}"
        print(f"PASS: Dispatch with auto-FEFO on no-selector request {transfer_id} succeeded")
    
    def test_07_full_lifecycle_without_source_selector(self, franchise_token, central_token):
        """Full lifecycle: request→approve→dispatch without source_selector"""
        # Get sources and catalog
        sources_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-sources",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={}
        )
        sources = sources_resp.json().get("data", sources_resp.json()).get("sources", [])
        source_id = sources[0]["restaurant_id"]
        
        catalog_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request-catalog",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={"source_restaurant_id": source_id}
        )
        items = catalog_resp.json().get("data", catalog_resp.json()).get("items", [])
        item = items[0]
        
        # Step 1: Request (no source_selector)
        req_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/request",
            headers={"Authorization": f"Bearer {franchise_token}"},
            json={
                "items": [{
                    "source_inventory_master_id": item["source_inventory_master_id"],
                    "stock_title": item["stock_title"],
                    "quantity": 0.1,
                    "unit": item.get("unit") or item.get("display_unit", "kg")
                }]
            }
        )
        assert req_resp.status_code == 200, f"Request failed: {req_resp.text}"
        transfer_id = req_resp.json().get("data", req_resp.json()).get("transfer_id")
        print(f"Step 1: Request created - transfer_id={transfer_id}")
        
        # Step 2: Approve
        approve_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/approve/{transfer_id}",
            headers={"Authorization": f"Bearer {central_token}"},
            json={}
        )
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        print(f"Step 2: Approved - transfer_id={transfer_id}")
        
        # Step 3: Dispatch (auto-FEFO)
        dispatch_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/dispatch/{transfer_id}",
            headers={"Authorization": f"Bearer {central_token}"},
            json={}
        )
        assert dispatch_resp.status_code == 200, f"Dispatch failed: {dispatch_resp.text}"
        print(f"Step 3: Dispatched - transfer_id={transfer_id}")
        
        # Verify final status
        details_resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/{transfer_id}",
            headers={"Authorization": f"Bearer {central_token}"}
        )
        assert details_resp.status_code == 200, f"Details failed: {details_resp.text}"
        data = details_resp.json().get("data", details_resp.json())
        transfer = data.get("transfer", data)
        status = transfer.get("status")
        
        assert status in ["dispatched", "in_transit"], f"Unexpected status: {status}"
        print(f"PASS: Full lifecycle completed - transfer {transfer_id} status={status}")


class TestPendingQueuesAndHistory:
    """Regression tests for other pages"""
    
    @pytest.fixture(scope="class")
    def central_token(self):
        """Get central user token"""
        resp = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": CENTRAL_EMAIL,
            "password": CENTRAL_PASSWORD,
            "fcm_token": "test"
        })
        return resp.json().get("token") or resp.json().get("data", {}).get("token")
    
    def test_pending_queues_loads(self, central_token):
        """Regression: Pending queues endpoint works"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/pending-queues",
            headers={"Authorization": f"Bearer {central_token}"},
            json={}
        )
        assert resp.status_code == 200, f"Pending queues failed: {resp.text}"
        print("PASS: Pending queues endpoint works")
    
    def test_transfer_history_loads(self, central_token):
        """Regression: Transfer history endpoint works"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/history",
            headers={"Authorization": f"Bearer {central_token}"},
            json={}
        )
        assert resp.status_code == 200, f"Transfer history failed: {resp.text}"
        print("PASS: Transfer history endpoint works")
    
    def test_hierarchy_summary_loads(self, central_token):
        """Regression: Hierarchy summary endpoint works"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            headers={"Authorization": f"Bearer {central_token}"},
            json={"store_type": "franchise"}
        )
        assert resp.status_code == 200, f"Hierarchy summary failed: {resp.text}"
        print("PASS: Hierarchy summary endpoint works")
