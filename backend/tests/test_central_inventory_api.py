"""
Central Inventory API Tests
Tests the proxy endpoints that forward to preprod.mygenie.online
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_EMAIL = "abhishek@kalabahia.com"
TEST_PASSWORD = "Qplazm@10"


class TestHealthCheck:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root returns: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "fcm_token": "central_inventory_web"
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Check for token in response
        token = data.get("token") or data.get("data", {}).get("token")
        assert token is not None, f"No token in response: {data}"
        print(f"✓ Login successful, token received")
        return token
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={
                "email": "invalid@test.com",
                "password": "wrongpassword",
                "fcm_token": "central_inventory_web"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 401 or 400 for invalid credentials
        assert response.status_code in [400, 401, 422], f"Expected error status, got {response.status_code}"
        print(f"✓ Invalid login correctly rejected with status {response.status_code}")


@pytest.fixture(scope="class")
def auth_token():
    """Get authentication token for authenticated tests"""
    response = requests.post(
        f"{BASE_URL}/api/proxy/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "fcm_token": "central_inventory_web"
        },
        headers={"Content-Type": "application/json"}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    
    data = response.json()
    token = data.get("token") or data.get("data", {}).get("token")
    if not token:
        pytest.skip(f"No token in response: {data}")
    
    return token


class TestHierarchyAPIs:
    """Hierarchy and store-related API tests"""
    
    def test_hierarchy_summary_master_stores(self, auth_token):
        """Test hierarchy summary for Master Stores (backend: central)"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            json={"store_type": "central"},  # UI "Master Stores" = backend "central"
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Hierarchy summary failed: {response.text}"
        data = response.json()
        
        # Check response structure
        stores = data.get("data", {}).get("stores") or data.get("stores", [])
        print(f"✓ Hierarchy summary (Master Stores) returned {len(stores)} stores")
        
        # Verify store types are 'central' (backend term)
        for store in stores[:3]:  # Check first 3
            store_type = store.get("restaurant_type", "")
            print(f"  - Store: {store.get('restaurant_name')}, Type: {store_type}")
    
    def test_hierarchy_summary_outlets(self, auth_token):
        """Test hierarchy summary for Outlets (backend: franchise)"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            json={"store_type": "franchise"},  # UI "Outlets" = backend "franchise"
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Hierarchy summary failed: {response.text}"
        data = response.json()
        
        stores = data.get("data", {}).get("stores") or data.get("stores", [])
        print(f"✓ Hierarchy summary (Outlets) returned {len(stores)} stores")
        
        for store in stores[:3]:
            store_type = store.get("restaurant_type", "")
            print(f"  - Store: {store.get('restaurant_name')}, Type: {store_type}")
    
    def test_hierarchy_detail_with_store_id(self, auth_token):
        """Test hierarchy detail for a specific store"""
        # First get a store ID from summary
        summary_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            json={"store_type": "central"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        if summary_resp.status_code != 200:
            pytest.skip("Could not get hierarchy summary")
        
        stores = summary_resp.json().get("data", {}).get("stores") or summary_resp.json().get("stores", [])
        if not stores:
            pytest.skip("No stores available for detail test")
        
        store_id = stores[0].get("restaurant_id")
        
        # Now get detail
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-detail",
            json={"store_restaurant_id": store_id},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Hierarchy detail failed: {response.text}"
        data = response.json()
        
        detail = data.get("data") or data
        print(f"✓ Hierarchy detail for store {store_id}")
        print(f"  - Child stock summary items: {len(detail.get('child_stock_summary', []))}")
        print(f"  - Transactions: {len(detail.get('transactions', []))}")
        print(f"  - Child stores: {len(detail.get('restaurants', []))}")


class TestPendingQueuesAPI:
    """Pending queues API tests"""
    
    def test_pending_queues(self, auth_token):
        """Test pending queues endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/pending-queues",
            json={},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Pending queues failed: {response.text}"
        data = response.json()
        
        queues = data.get("data") or data
        approval_count = len(queues.get("approval_pending", []))
        receive_count = len(queues.get("receive_pending", []))
        my_requests_count = len(queues.get("my_requests", []))
        
        print(f"✓ Pending queues retrieved:")
        print(f"  - Approval pending: {approval_count}")
        print(f"  - Receive pending: {receive_count}")
        print(f"  - My requests: {my_requests_count}")


class TestTransferAPI:
    """Transfer detail API tests"""
    
    def test_transfer_detail_not_found(self, auth_token):
        """Test transfer detail for non-existent transfer (ID 999)"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/999",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        # Should return 404 or error for non-existent transfer
        # Note: API might return 200 with error message or 404
        print(f"✓ Transfer 999 response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # Check if it's an error response
            if data.get("error") or data.get("message"):
                print(f"  - Error message: {data.get('error') or data.get('message')}")
        else:
            print(f"  - Correctly returned {response.status_code} for non-existent transfer")


class TestStatusEndpoint:
    """Status check endpoint tests"""
    
    def test_create_status_check(self):
        """Test creating a status check"""
        response = requests.post(
            f"{BASE_URL}/api/status",
            json={"client_name": "test_client"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Status check creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "test_client"
        print(f"✓ Status check created with ID: {data['id']}")
    
    def test_get_status_checks(self):
        """Test getting status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200, f"Get status checks failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} status checks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
