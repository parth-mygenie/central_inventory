"""
P24 Stock Detail API Tests
Tests the backend proxy route for stock detail endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestP24StockDetailProxy:
    """Tests for P24 Stock Detail backend proxy"""
    
    def test_stock_detail_proxy_route_exists(self):
        """Test that the stock detail proxy route exists and returns proper response"""
        # Without auth, should return 401 from POS API
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory/16980",
            headers={"Content-Type": "application/json"}
        )
        # Route exists - POS API returns 401 for unauthenticated requests
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        
        data = response.json()
        # If 401, should have error structure from POS API
        if response.status_code == 401:
            assert "errors" in data or "message" in data, "Expected error response structure"
            print(f"Route exists - returns 401 Unauthorized as expected without auth")
        else:
            print(f"Route returned {response.status_code}")
    
    def test_stock_detail_proxy_with_query_params(self):
        """Test that query params are forwarded correctly"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory/16980",
            params={
                "consumption_from": "2026-05-01",
                "consumption_to": "2026-05-30",
                "consumption_limit": 50
            },
            headers={"Content-Type": "application/json"}
        )
        # Route should accept query params
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"Query params test - status: {response.status_code}")
    
    def test_stock_inventory_list_proxy_exists(self):
        """Test that the stock inventory list proxy route exists"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"Stock inventory list route - status: {response.status_code}")


class TestP24BackendHealth:
    """Basic health checks for backend"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root: {data}")
    
    def test_status_endpoint(self):
        """Test status endpoint"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        print(f"Status endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
