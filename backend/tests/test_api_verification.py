"""
Backend API Tests for Internal API Verification Tool
Tests: /api/api-catalog, /api/proxy, /api/verifications CRUD
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndCatalog:
    """Test health check and API catalog endpoints"""
    
    def test_root_endpoint(self):
        """Test root API endpoint returns hello world"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
        print(f"✓ Root endpoint working: {data}")
    
    def test_api_catalog_returns_data(self):
        """Test /api/api-catalog returns pre-configured catalog"""
        response = requests.get(f"{BASE_URL}/api/api-catalog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ API catalog returned {len(data)} groups")
    
    def test_api_catalog_has_correct_groups(self):
        """Test catalog has 6 expected groups"""
        response = requests.get(f"{BASE_URL}/api/api-catalog")
        assert response.status_code == 200
        data = response.json()
        
        expected_groups = [
            "Hierarchy & Reporting",
            "Transfer Flow",
            "Stock & Source",
            "Queues & History",
            "Auth",
            "Franchise"
        ]
        
        actual_groups = [g["group"] for g in data]
        for expected in expected_groups:
            assert expected in actual_groups, f"Missing group: {expected}"
        print(f"✓ All 6 expected groups present: {actual_groups}")
    
    def test_api_catalog_has_20_apis(self):
        """Test catalog has total 20 APIs across all groups"""
        response = requests.get(f"{BASE_URL}/api/api-catalog")
        assert response.status_code == 200
        data = response.json()
        
        total_apis = sum(len(g["apis"]) for g in data)
        assert total_apis == 20, f"Expected 20 APIs, got {total_apis}"
        print(f"✓ Total APIs: {total_apis}")
    
    def test_api_catalog_group_counts(self):
        """Test each group has correct number of APIs"""
        response = requests.get(f"{BASE_URL}/api/api-catalog")
        assert response.status_code == 200
        data = response.json()
        
        expected_counts = {
            "Hierarchy & Reporting": 3,
            "Transfer Flow": 9,
            "Stock & Source": 2,
            "Queues & History": 3,
            "Auth": 1,
            "Franchise": 2
        }
        
        for group in data:
            group_name = group["group"]
            api_count = len(group["apis"])
            expected = expected_counts.get(group_name, 0)
            assert api_count == expected, f"{group_name}: expected {expected} APIs, got {api_count}"
            print(f"✓ {group_name}: {api_count} APIs")
    
    def test_api_catalog_api_structure(self):
        """Test each API has required fields"""
        response = requests.get(f"{BASE_URL}/api/api-catalog")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["name", "workflow", "endpoint", "method", "terminology_risk", "notes"]
        
        for group in data:
            for api in group["apis"]:
                for field in required_fields:
                    assert field in api, f"API {api.get('name', 'unknown')} missing field: {field}"
        print("✓ All APIs have required fields")


class TestProxyEndpoint:
    """Test /api/proxy endpoint for proxying requests"""
    
    def test_proxy_get_request(self):
        """Test proxy can make GET request to external URL"""
        response = requests.post(f"{BASE_URL}/api/proxy", json={
            "url": "https://httpbin.org/get",
            "method": "GET",
            "headers": {"Accept": "application/json"},
            "timeout": 10
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "status_code" in data
        assert "headers" in data
        assert "body" in data
        assert "elapsed_ms" in data
        assert data["status_code"] == 200
        print(f"✓ Proxy GET request successful, elapsed: {data['elapsed_ms']}ms")
    
    def test_proxy_post_request(self):
        """Test proxy can make POST request with body"""
        test_body = {"test": "data", "number": 123}
        response = requests.post(f"{BASE_URL}/api/proxy", json={
            "url": "https://httpbin.org/post",
            "method": "POST",
            "headers": {"Content-Type": "application/json"},
            "body": test_body,
            "timeout": 10
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status_code"] == 200
        assert "body" in data
        # httpbin echoes back the JSON in the 'json' field
        if isinstance(data["body"], dict) and "json" in data["body"]:
            assert data["body"]["json"] == test_body
        print(f"✓ Proxy POST request successful with body echo")
    
    def test_proxy_timeout_handling(self):
        """Test proxy handles timeout gracefully"""
        response = requests.post(f"{BASE_URL}/api/proxy", json={
            "url": "https://httpbin.org/delay/5",
            "method": "GET",
            "timeout": 1  # 1 second timeout, request takes 5 seconds
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should return error for timeout
        assert data["status_code"] == 0 or data.get("error") is not None
        print(f"✓ Proxy timeout handled: {data.get('error', 'status_code=0')}")
    
    def test_proxy_invalid_url(self):
        """Test proxy handles invalid URL gracefully"""
        response = requests.post(f"{BASE_URL}/api/proxy", json={
            "url": "https://invalid-domain-that-does-not-exist-12345.com/api",
            "method": "GET",
            "timeout": 5
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should return error
        assert data["status_code"] == 0 or data.get("error") is not None
        print(f"✓ Proxy invalid URL handled: {data.get('error', 'status_code=0')}")


class TestVerificationsCRUD:
    """Test /api/verifications CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data prefix for cleanup"""
        self.test_prefix = "TEST_VERIFICATION_"
        yield
        # Cleanup: Delete all test records
        try:
            response = requests.get(f"{BASE_URL}/api/verifications")
            if response.status_code == 200:
                records = response.json()
                for rec in records:
                    if rec.get("api_name", "").startswith(self.test_prefix):
                        requests.delete(f"{BASE_URL}/api/verifications/{rec['id']}")
        except:
            pass
    
    def test_create_verification_record(self):
        """Test POST /api/verifications creates a record"""
        payload = {
            "api_name": "TEST_VERIFICATION_Create",
            "workflow": "Test workflow",
            "endpoint": "https://test.com/api/test",
            "method": "POST",
            "request_payload": {"test": "data"},
            "request_headers": {"Authorization": "Bearer test"},
            "response_status": 200,
            "response_body": {"success": True},
            "elapsed_ms": 150.5,
            "status": "verified_working",
            "terminology_flags": ["restaurant_type: master -> Central"],
            "notes": "Test notes"
        }
        
        response = requests.post(f"{BASE_URL}/api/verifications", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["api_name"] == payload["api_name"]
        assert data["workflow"] == payload["workflow"]
        assert data["endpoint"] == payload["endpoint"]
        assert data["method"] == payload["method"]
        assert data["status"] == payload["status"]
        assert data["notes"] == payload["notes"]
        assert "created_at" in data
        assert "updated_at" in data
        print(f"✓ Created verification record with id: {data['id']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/verifications")
        assert get_response.status_code == 200
        records = get_response.json()
        found = any(r["id"] == data["id"] for r in records)
        assert found, "Created record not found in GET response"
        print("✓ Record persisted and found in GET")
    
    def test_get_verifications_list(self):
        """Test GET /api/verifications returns list"""
        response = requests.get(f"{BASE_URL}/api/verifications")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ GET verifications returned {len(data)} records")
    
    def test_update_verification_record(self):
        """Test PUT /api/verifications/{id} updates a record"""
        # First create a record
        create_payload = {
            "api_name": "TEST_VERIFICATION_Update",
            "workflow": "Test workflow",
            "endpoint": "https://test.com/api/test",
            "method": "GET",
            "status": "not_tested",
            "notes": "Original notes"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/verifications", json=create_payload)
        assert create_response.status_code == 200
        record_id = create_response.json()["id"]
        
        # Update the record
        update_payload = {
            "status": "verified_working",
            "notes": "Updated notes after testing"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/verifications/{record_id}", json=update_payload)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        
        assert updated_data["status"] == "verified_working"
        assert updated_data["notes"] == "Updated notes after testing"
        print(f"✓ Updated verification record: {record_id}")
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/verifications")
        records = get_response.json()
        found_record = next((r for r in records if r["id"] == record_id), None)
        assert found_record is not None
        assert found_record["status"] == "verified_working"
        print("✓ Update persisted correctly")
    
    def test_update_nonexistent_record_returns_404(self):
        """Test PUT /api/verifications/{id} returns 404 for nonexistent record"""
        response = requests.put(f"{BASE_URL}/api/verifications/nonexistent-id-12345", json={
            "status": "verified_working"
        })
        assert response.status_code == 404
        print("✓ Update nonexistent record returns 404")
    
    def test_delete_verification_record(self):
        """Test DELETE /api/verifications/{id} deletes a record"""
        # First create a record
        create_payload = {
            "api_name": "TEST_VERIFICATION_Delete",
            "workflow": "Test workflow",
            "endpoint": "https://test.com/api/test",
            "method": "DELETE",
            "status": "not_tested"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/verifications", json=create_payload)
        assert create_response.status_code == 200
        record_id = create_response.json()["id"]
        
        # Delete the record
        delete_response = requests.delete(f"{BASE_URL}/api/verifications/{record_id}")
        assert delete_response.status_code == 200
        delete_data = delete_response.json()
        assert delete_data.get("deleted") == True
        print(f"✓ Deleted verification record: {record_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/verifications")
        records = get_response.json()
        found = any(r["id"] == record_id for r in records)
        assert not found, "Deleted record still found in GET response"
        print("✓ Record successfully removed from database")
    
    def test_delete_nonexistent_record_returns_404(self):
        """Test DELETE /api/verifications/{id} returns 404 for nonexistent record"""
        response = requests.delete(f"{BASE_URL}/api/verifications/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Delete nonexistent record returns 404")


class TestVerificationStatuses:
    """Test verification status values are accepted"""
    
    def test_all_verification_statuses_accepted(self):
        """Test all 9 verification statuses can be saved"""
        statuses = [
            "not_tested",
            "verified_working",
            "verified_with_notes",
            "failed",
            "blocked_backend_issue",
            "blocked_auth_issue",
            "blocked_terminology_unclear",
            "needs_backend_fix",
            "unclear"
        ]
        
        created_ids = []
        
        for status in statuses:
            payload = {
                "api_name": f"TEST_STATUS_{status}",
                "workflow": "Status test",
                "endpoint": "https://test.com/api",
                "method": "GET",
                "status": status
            }
            
            response = requests.post(f"{BASE_URL}/api/verifications", json=payload)
            assert response.status_code == 200, f"Failed to create record with status: {status}"
            data = response.json()
            assert data["status"] == status
            created_ids.append(data["id"])
            print(f"✓ Status '{status}' accepted")
        
        # Cleanup
        for record_id in created_ids:
            requests.delete(f"{BASE_URL}/api/verifications/{record_id}")
        
        print(f"✓ All {len(statuses)} verification statuses work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
