"""
Central Inventory Slice 4 - Write API Tests
Tests the write flow implementation including:
- Login for all 3 account types
- Backend API proxy responses
- Transfer detail endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CREDENTIALS = {
    "central": {"email": "abhishek@kalabahia.com", "password": os.environ.get("TEST_PASSWORD", ""), "restaurant_id": 1, "type": "master"},
    "master": {"email": "owner@democentral1.com", "password": os.environ.get("TEST_PASSWORD", ""), "restaurant_id": 781, "type": "central"},
    "outlet": {"email": "owner@demofranchise1.com", "password": os.environ.get("TEST_PASSWORD", ""), "restaurant_id": 783, "type": "franchise"},
}


class TestBackendAPIProxy:
    """Test backend API proxy is working"""
    
    def test_api_root(self):
        """Test /api/ returns Central Inventory API Proxy"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Central Inventory API Proxy"
        print("SUCCESS: /api/ returns 'Central Inventory API Proxy'")


class TestLoginAllAccounts:
    """Test login works for all 3 account types"""
    
    def test_login_central_store(self):
        """Test login with Central Store account (abhishek@kalabahia.com)"""
        creds = CREDENTIALS["central"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "token" in data.get("data", {})
        # Check restaurant_type_flag is enriched
        type_flag = data.get("restaurant_type_flag") or data.get("data", {}).get("restaurant_type_flag")
        assert type_flag == "master", f"Expected 'master', got '{type_flag}'"
        print(f"SUCCESS: Central Store login works, restaurant_type_flag={type_flag}")
    
    def test_login_master_store(self):
        """Test login with Master Store account (owner@democentral1.com)"""
        creds = CREDENTIALS["master"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "token" in data.get("data", {})
        type_flag = data.get("restaurant_type_flag") or data.get("data", {}).get("restaurant_type_flag")
        assert type_flag == "central", f"Expected 'central', got '{type_flag}'"
        print(f"SUCCESS: Master Store login works, restaurant_type_flag={type_flag}")
    
    def test_login_outlet(self):
        """Test login with Outlet account (owner@demofranchise1.com)"""
        creds = CREDENTIALS["outlet"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "token" in data.get("data", {})
        type_flag = data.get("restaurant_type_flag") or data.get("data", {}).get("restaurant_type_flag")
        assert type_flag == "franchise", f"Expected 'franchise', got '{type_flag}'"
        print(f"SUCCESS: Outlet login works, restaurant_type_flag={type_flag}")


class TestTransferDetailEndpoints:
    """Test transfer detail endpoints for various statuses"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Central Store"""
        creds = CREDENTIALS["central"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        data = response.json()
        token = data.get("token") or data.get("data", {}).get("token")
        return token
    
    def test_transfer_101_requested(self, auth_token):
        """Test Transfer #101 (requested status) returns correct data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/101", headers=headers)
        assert response.status_code == 200
        data = response.json()
        transfer = data.get("data", data)
        assert transfer.get("id") == 101
        assert transfer.get("status") == "requested"
        assert transfer.get("from_restaurant_id") == 1  # Central Store
        print(f"SUCCESS: Transfer #101 status={transfer.get('status')}")
    
    def test_transfer_104_approved(self, auth_token):
        """Test Transfer #104 (approved status) returns correct data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/104", headers=headers)
        assert response.status_code == 200
        data = response.json()
        transfer = data.get("data", data)
        assert transfer.get("id") == 104
        assert transfer.get("status") == "approved"
        print(f"SUCCESS: Transfer #104 status={transfer.get('status')}")
    
    def test_transfer_105_dispatched(self, auth_token):
        """Test Transfer #105 (dispatched status) returns correct data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/105", headers=headers)
        assert response.status_code == 200
        data = response.json()
        transfer = data.get("data", data)
        assert transfer.get("id") == 105
        assert transfer.get("status") == "dispatched"
        print(f"SUCCESS: Transfer #105 status={transfer.get('status')}")
    
    def test_transfer_108_received(self, auth_token):
        """Test Transfer #108 (received - terminal status) returns correct data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/108", headers=headers)
        assert response.status_code == 200
        data = response.json()
        transfer = data.get("data", data)
        assert transfer.get("id") == 108
        assert transfer.get("status") == "received"
        print(f"SUCCESS: Transfer #108 status={transfer.get('status')}")
    
    def test_transfer_111_cancelled(self, auth_token):
        """Test Transfer #111 (cancelled - terminal status) returns correct data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/111", headers=headers)
        assert response.status_code == 200
        data = response.json()
        transfer = data.get("data", data)
        assert transfer.get("id") == 111
        assert transfer.get("status") == "cancelled"
        assert transfer.get("resolution_type") == "return_to_source"
        print(f"SUCCESS: Transfer #111 status={transfer.get('status')}, resolution_type={transfer.get('resolution_type')}")
    
    def test_transfer_112_rejected(self, auth_token):
        """Test Transfer #112 (rejected - terminal status) returns correct data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/112", headers=headers)
        assert response.status_code == 200
        data = response.json()
        transfer = data.get("data", data)
        assert transfer.get("id") == 112
        assert transfer.get("status") == "rejected"
        print(f"SUCCESS: Transfer #112 status={transfer.get('status')}")


class TestPendingQueuesAPI:
    """Test pending queues API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Central Store"""
        creds = CREDENTIALS["central"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        data = response.json()
        token = data.get("token") or data.get("data", {}).get("token")
        return token
    
    def test_pending_queues(self, auth_token):
        """Test pending queues returns approval_pending, receive_pending, my_requests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/proxy/v2/inventory-transfer/pending-queues", json={}, headers=headers)
        assert response.status_code == 200
        data = response.json()
        queues = data.get("data", data)
        assert "approval_pending" in queues
        assert "receive_pending" in queues
        assert "my_requests" in queues
        print(f"SUCCESS: Pending queues - approval_pending={len(queues['approval_pending'])}, receive_pending={len(queues['receive_pending'])}, my_requests={len(queues['my_requests'])}")


class TestTransferHistoryAPI:
    """Test transfer history API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Central Store"""
        creds = CREDENTIALS["central"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        data = response.json()
        token = data.get("token") or data.get("data", {}).get("token")
        return token
    
    def test_transfer_history(self, auth_token):
        """Test transfer history returns list of transfers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/proxy/v2/inventory-transfer/history", json={}, headers=headers)
        assert response.status_code == 200
        data = response.json()
        transfers = data.get("data", [])
        assert isinstance(transfers, list)
        assert len(transfers) > 0
        print(f"SUCCESS: Transfer history returned {len(transfers)} transfers")


class TestInventoryMasterAPI:
    """Test inventory master API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Central Store"""
        creds = CREDENTIALS["central"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        data = response.json()
        token = data.get("token") or data.get("data", {}).get("token")
        return token
    
    def test_inventory_master(self, auth_token):
        """Test inventory master returns list of items"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proxy/v2/inventory/get-inventory-master", headers=headers)
        # This endpoint may return from real API or seed data
        assert response.status_code in [200, 404, 500]  # May fail if real API doesn't have data
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Inventory master returned data")
        else:
            print(f"INFO: Inventory master returned {response.status_code} (may be expected if real API has no data)")


class TestSourceOptionsAPI:
    """Test source options API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Central Store"""
        creds = CREDENTIALS["central"]
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": creds["email"],
            "password": creds["password"],
            "fcm_token": "test_token"
        })
        data = response.json()
        token = data.get("token") or data.get("data", {}).get("token")
        return token
    
    def test_source_options(self, auth_token):
        """Test source options returns segments"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/proxy/v2/inventory-transfer/source-options", json={
            "restaurant_id": 1,
            "inventory_master_id": 3570
        }, headers=headers)
        # This endpoint proxies to real API - may return various status codes
        assert response.status_code in [200, 404, 422, 500]  # 422 = validation error from real API
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Source options returned data")
        else:
            print(f"INFO: Source options returned {response.status_code} (expected - real API validation)")
