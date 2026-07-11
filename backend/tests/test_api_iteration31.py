"""
Backend API Tests - Iteration 31
Tests for Central Inventory API endpoints:
- GET /api/ - Root endpoint
- POST /api/status - Create status check
- GET /api/status - List status checks
- POST /api/proxy/auth/login - Auth proxy endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRootEndpoint:
    """Test GET /api/ root endpoint"""
    
    def test_root_returns_200(self):
        """Root endpoint should return 200 OK"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
    def test_root_returns_correct_message(self):
        """Root endpoint should return Central Inventory API Proxy message"""
        response = requests.get(f"{BASE_URL}/api/")
        data = response.json()
        assert "message" in data
        assert data["message"] == "Central Inventory API Proxy"


class TestStatusEndpoints:
    """Test /api/status CRUD endpoints"""
    
    def test_create_status_check(self):
        """POST /api/status should create a new status check"""
        unique_client = f"test_client_{uuid.uuid4().hex[:8]}"
        payload = {"client_name": unique_client}
        
        response = requests.post(
            f"{BASE_URL}/api/status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "client_name" in data
        assert "timestamp" in data
        
        # Verify data values
        assert data["client_name"] == unique_client
        assert isinstance(data["id"], str)
        assert len(data["id"]) > 0
        
    def test_list_status_checks(self):
        """GET /api/status should return list of status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        
        # If there are items, verify structure
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "client_name" in item
            assert "timestamp" in item
            
    def test_create_and_verify_persistence(self):
        """Create status check and verify it appears in list"""
        unique_client = f"test_persist_{uuid.uuid4().hex[:8]}"
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/status",
            json={"client_name": unique_client},
            headers={"Content-Type": "application/json"}
        )
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Verify in list
        list_response = requests.get(f"{BASE_URL}/api/status")
        assert list_response.status_code == 200
        
        items = list_response.json()
        found = any(item["id"] == created_id for item in items)
        assert found, f"Created status check {created_id} not found in list"


class TestAuthProxyEndpoint:
    """Test /api/proxy/auth/login proxy endpoint"""
    
    def test_proxy_login_endpoint_exists(self):
        """POST /api/proxy/auth/login should exist and respond"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": "test@example.com", "password": "test123"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should get a response (not 404 or 500)
        # External API returns 401 for invalid credentials which is expected
        assert response.status_code in [200, 401, 400]
        
    def test_proxy_login_returns_json(self):
        """Proxy login should return JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpass"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return JSON
        data = response.json()
        assert isinstance(data, dict)
        
    def test_proxy_login_invalid_credentials_error(self):
        """Proxy login with invalid credentials should return error"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/auth/login",
            json={"email": "fake@example.com", "password": "fakepass"},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        # External API returns errors array for invalid credentials
        assert "errors" in data or "error" in data or "message" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
