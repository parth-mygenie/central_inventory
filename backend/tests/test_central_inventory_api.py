"""
Central Inventory API Tests - Fresh Deployment Verification
Tests backend proxy routes to preprod.mygenie.online POS API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_CREDENTIALS = {
    "central": {"email": "abhishek@kalabahia.com", "password": "Qplazm@10"},
    "master": {"email": "owner@democentral1.com", "password": "Qplazm@10"},
    "outlet": {"email": "owner@demofranchise1.com", "password": "Qplazm@10"},
}


class TestBackendHealth:
    """Basic backend health checks"""
    
    def test_api_root_responds(self):
        """Test /api/ root endpoint returns proxy message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Central Inventory" in data["message"]
        print(f"✓ API root responds: {data['message']}")


class TestAuthProxy:
    """Authentication proxy tests"""
    
    def test_login_central_store(self):
        """Test login with Central Store credentials (abhishek@kalabahia.com)"""
        creds = TEST_CREDENTIALS["central"]
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": creds["email"], "password": creds["password"], "fcm_token": "test"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify token returned
        assert "token" in data, "No token in response"
        assert len(data["token"]) > 0, "Token is empty"
        
        # Verify restaurant context enrichment from POS profile
        assert "restaurant_id" in data, "Missing restaurant_id from profile enrichment"
        assert "restaurant_type_flag" in data, "Missing restaurant_type_flag"
        assert data["restaurant_type_flag"] == "master", f"Expected master type, got {data['restaurant_type_flag']}"
        
        print(f"✓ Central login success: rid={data['restaurant_id']}, type={data['restaurant_type_flag']}")
        return data["token"]
    
    def test_login_master_store(self):
        """Test login with Master Store credentials (owner@democentral1.com)"""
        creds = TEST_CREDENTIALS["master"]
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": creds["email"], "password": creds["password"], "fcm_token": "test"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "restaurant_type_flag" in data
        assert data["restaurant_type_flag"] == "central", f"Expected central type, got {data['restaurant_type_flag']}"
        print(f"✓ Master login success: rid={data.get('restaurant_id')}, type={data['restaurant_type_flag']}")
    
    def test_login_outlet_store(self):
        """Test login with Outlet credentials (owner@demofranchise1.com)"""
        creds = TEST_CREDENTIALS["outlet"]
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": creds["email"], "password": creds["password"], "fcm_token": "test"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "restaurant_type_flag" in data
        assert data["restaurant_type_flag"] == "franchise", f"Expected franchise type, got {data['restaurant_type_flag']}"
        print(f"✓ Outlet login success: rid={data.get('restaurant_id')}, type={data['restaurant_type_flag']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns error"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpass", "fcm_token": "test"},
            headers={"Content-Type": "application/json"}
        )
        # POS API returns 401 or 400 for invalid credentials
        assert response.status_code in [400, 401, 422], f"Expected error status, got {response.status_code}"
        print(f"✓ Invalid credentials rejected with status {response.status_code}")


class TestV2ProxyEndpoints:
    """V2 proxy endpoint tests (require auth token)"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        creds = TEST_CREDENTIALS["central"]
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": creds["email"], "password": creds["password"], "fcm_token": "test"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip("Authentication failed - skipping V2 tests")
    
    def test_hierarchy_summary_franchise(self):
        """Test hierarchy-summary endpoint with store_type=franchise"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            json={"store_type": "franchise"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Hierarchy summary failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "data" in data or "stores" in data, "Missing data in response"
        stores = data.get("data", {}).get("stores", []) or data.get("stores", [])
        assert isinstance(stores, list), "Stores should be a list"
        
        # Verify store data structure
        if len(stores) > 0:
            store = stores[0]
            assert "restaurant_id" in store, "Missing restaurant_id in store"
            assert "restaurant_name" in store, "Missing restaurant_name in store"
        
        print(f"✓ Hierarchy summary returned {len(stores)} franchise stores")
    
    def test_hierarchy_summary_central(self):
        """Test hierarchy-summary endpoint with store_type=central"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            json={"store_type": "central"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Hierarchy summary failed: {response.text}"
        data = response.json()
        stores = data.get("data", {}).get("stores", []) or data.get("stores", [])
        print(f"✓ Hierarchy summary returned {len(stores)} central stores")
    
    def test_pending_queues(self):
        """Test pending-queues endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/pending-queues",
            json={},
            headers=self.headers
        )
        assert response.status_code == 200, f"Pending queues failed: {response.text}"
        data = response.json()
        print(f"✓ Pending queues endpoint responded successfully")
    
    def test_transfer_history(self):
        """Test transfer history endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/history",
            json={"limit": 10},
            headers=self.headers
        )
        assert response.status_code == 200, f"Transfer history failed: {response.text}"
        data = response.json()
        print(f"✓ Transfer history endpoint responded successfully")
    
    def test_stock_inventory(self):
        """Test stock-inventory endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory",
            headers=self.headers
        )
        assert response.status_code == 200, f"Stock inventory failed: {response.text}"
        data = response.json()
        print(f"✓ Stock inventory endpoint responded successfully")
    
    def test_inventory_master(self):
        """Test get-inventory-master endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/get-inventory-master",
            headers=self.headers
        )
        assert response.status_code == 200, f"Inventory master failed: {response.text}"
        data = response.json()
        print(f"✓ Inventory master endpoint responded successfully")
    
    def test_franchise_list(self):
        """Test franchise list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/franchise/list?limit=25",
            headers=self.headers
        )
        assert response.status_code == 200, f"Franchise list failed: {response.text}"
        data = response.json()
        print(f"✓ Franchise list endpoint responded successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
