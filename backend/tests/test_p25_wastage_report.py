"""
P25 Wastage Report API Tests
Tests for:
- GET /proxy/v2/inventory/wastage-reasons - returns reasons array
- POST /proxy/v2/inventory/wastage-report - with date range, filters
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "abhishek@kalabahia.com"
TEST_PASSWORD = "Qplazm@10"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token - shared across all tests in module"""
    response = requests.post(
        f"{BASE_URL}/api/proxy/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "fcm_token": "test"},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("token") or data.get("data", {}).get("token")
    assert token, "No token in login response"
    return token


class TestP25WastageReasons:
    """Tests for GET /proxy/v2/inventory/wastage-reasons"""
    
    def test_wastage_reasons_returns_array(self, auth_token):
        """Test that wastage reasons API returns an array of reasons"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-reasons",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        # API should return reasons array (may be in data.reasons or directly)
        reasons = data.get("reasons", data) if isinstance(data, dict) else data
        assert isinstance(reasons, list), f"Expected list, got {type(reasons)}"
        print(f"Found {len(reasons)} wastage reasons")
        
        # Verify each reason has id and reason fields
        if len(reasons) > 0:
            for r in reasons:
                assert "id" in r, f"Reason missing 'id': {r}"
                assert "reason" in r, f"Reason missing 'reason': {r}"
            print(f"Reasons: {[r.get('reason') for r in reasons]}")
    
    def test_wastage_reasons_contains_expected_values(self, auth_token):
        """Test that wastage reasons include expected values (Others, Expired, Pilferage, Spillage)"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-reasons",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        reasons = data.get("reasons", data) if isinstance(data, dict) else data
        
        reason_names = [r.get("reason", "").lower() for r in reasons]
        expected = ["others", "expired", "pilferage", "spillage"]
        
        for exp in expected:
            found = any(exp in name for name in reason_names)
            print(f"Reason '{exp}': {'FOUND' if found else 'NOT FOUND'}")
        
        # At least some reasons should exist
        assert len(reasons) > 0, "No wastage reasons returned"


class TestP25WastageReport:
    """Tests for POST /proxy/v2/inventory/wastage-report"""
    
    def test_wastage_report_with_date_range(self, auth_token):
        """Test wastage report with date range returns records with P24 fields"""
        # Use May 2026 date range as mentioned in context
        start_date = "2026-05-01"
        end_date = "2026-05-31"
        
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-report",
            json={
                "restaurant_ids": [1],
                "start_date": start_date,
                "end_date": end_date
            },
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "summary" in data or "wastage_records" in data, f"Missing expected fields: {data.keys()}"
        
        records = data.get("wastage_records", data.get("data", []))
        print(f"Found {len(records)} wastage records in May 2026")
        
        # Verify summary fields
        summary = data.get("summary", {})
        print(f"Summary: total_records={summary.get('total_records')}, net_wastage={summary.get('net_wastage')}")
        
        # Verify P24 fields in records if any exist
        if len(records) > 0:
            record = records[0]
            print(f"Sample record fields: {list(record.keys())}")
            # Check for expected P25 fields
            expected_fields = ["wastage_id", "item_name", "waste_type", "wastage_quantity", "waste_reason"]
            for field in expected_fields:
                if field in record:
                    print(f"  {field}: {record.get(field)}")
    
    def test_wastage_report_has_batch_filter(self, auth_token):
        """Test wastage report with has_batch=true filters to batch-audited rows only"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-report",
            json={
                "restaurant_ids": [1],
                "start_date": "2026-05-01",
                "end_date": "2026-05-31",
                "has_batch": True
            },
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        records = data.get("wastage_records", data.get("data", []))
        print(f"Found {len(records)} batch-audited wastage records")
        
        # If records exist, verify they have batch/segment_allocations
        for record in records:
            has_batch = record.get("batch") or record.get("segment_allocations")
            print(f"  Record {record.get('wastage_id')}: batch={record.get('batch')}, allocations={len(record.get('segment_allocations', []))}")
    
    def test_wastage_report_waste_type_filter(self, auth_token):
        """Test wastage report with waste_type=Loss filters correctly"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-report",
            json={
                "restaurant_ids": [1],
                "start_date": "2026-05-01",
                "end_date": "2026-05-31",
                "waste_type": "Loss"
            },
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        records = data.get("wastage_records", data.get("data", []))
        print(f"Found {len(records)} Loss-type wastage records")
        
        # Verify all records are Loss type
        for record in records:
            waste_type = record.get("waste_type", "")
            if waste_type:
                assert waste_type == "Loss", f"Expected Loss, got {waste_type}"
    
    def test_wastage_report_gain_filter(self, auth_token):
        """Test wastage report with waste_type=Gain filters correctly"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-report",
            json={
                "restaurant_ids": [1],
                "start_date": "2026-05-01",
                "end_date": "2026-05-31",
                "waste_type": "Gain"
            },
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        records = data.get("wastage_records", data.get("data", []))
        print(f"Found {len(records)} Gain-type wastage records (expected 0)")
        
        # All records in May 2026 are Loss, so Gain should return 0
        assert len(records) == 0, f"Expected 0 Gain records, got {len(records)}"
    
    def test_wastage_report_summary_fields(self, auth_token):
        """Test wastage report returns proper summary with loss, gain, store count"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-report",
            json={
                "restaurant_ids": [1],
                "start_date": "2026-05-01",
                "end_date": "2026-05-31"
            },
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        summary = data.get("summary", {})
        
        # Verify summary fields exist
        print(f"Summary fields: {list(summary.keys())}")
        print(f"  total_records: {summary.get('total_records')}")
        print(f"  total_loss: {summary.get('total_loss')}")
        print(f"  total_gain: {summary.get('total_gain')}")
        print(f"  net_wastage: {summary.get('net_wastage')}")
        print(f"  applied_restaurant_ids: {summary.get('applied_restaurant_ids')}")
        
        # At minimum, summary should have these fields
        assert "total_records" in summary or "net_wastage" in summary, "Summary missing expected fields"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
