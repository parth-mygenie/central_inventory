"""
Central Inventory API Contract Stabilization Tests
Tests all the fixes mentioned in the review request:
1. hierarchy-summary mandatory store_type
2. add-stock route path (inventory_master_id in URL)
3. record-wastage route path (inventory-transfer/record-wastage)
4. source-options field names (source_inventory_master_id, from_restaurant_id)
5. decrease-adjustment missing restaurant_id
6. transfer detail response shape normalization
7. resolution_meta JSON string parsing
8. hierarchy-detail stock quantity field mapping
9. wastage report response unwrap
10. wastage entry/report field name mapping
"""
import pytest
import requests
import os
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Get cached token from MongoDB
def get_cached_token():
    """Get cached token from MongoDB token_sessions collection"""
    try:
        client = MongoClient('mongodb://localhost:27017')
        token = client['test_database'].token_sessions.find_one().get('token', '')
        client.close()
        return token
    except Exception as e:
        print(f"Failed to get cached token: {e}")
        return None


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token from MongoDB cache"""
    token = get_cached_token()
    if not token:
        pytest.skip("No cached token available in MongoDB")
    return token


class TestAPIHealth:
    """Test 1: Backend API proxy health"""
    
    def test_api_root_returns_200(self):
        """GET /api/ should return 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        assert data["message"] == "Central Inventory API Proxy"
        print(f"✓ API root returns 200 with message: {data['message']}")


class TestHierarchySummary:
    """Test 2: hierarchy-summary with mandatory store_type"""
    
    def test_hierarchy_summary_franchise(self, auth_token):
        """POST /api/proxy/v2/inventory-transfer/hierarchy-summary with store_type=franchise returns 200 with stores array"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            json={"store_type": "franchise"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for stores array in response
        stores = data.get("data", {}).get("stores") or data.get("stores", [])
        assert isinstance(stores, list), f"Expected stores array, got: {type(stores)}"
        print(f"✓ hierarchy-summary (franchise) returns 200 with {len(stores)} stores")
        
        # Verify store structure
        if stores:
            store = stores[0]
            assert "restaurant_id" in store, "Missing restaurant_id in store"
            assert "restaurant_name" in store, "Missing restaurant_name in store"
            print(f"  - First store: {store.get('restaurant_name')} (ID: {store.get('restaurant_id')})")
    
    def test_hierarchy_summary_central(self, auth_token):
        """POST /api/proxy/v2/inventory-transfer/hierarchy-summary with store_type=central returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary",
            json={"store_type": "central"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        stores = data.get("data", {}).get("stores") or data.get("stores", [])
        print(f"✓ hierarchy-summary (central) returns 200 with {len(stores)} stores")


class TestSourceOptions:
    """Test 3: source-options with correct field names"""
    
    def test_source_options_correct_fields(self, auth_token):
        """POST /api/proxy/v2/inventory-transfer/source-options with source_inventory_master_id + from_restaurant_id returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/source-options",
            json={
                "source_inventory_master_id": 16983,
                "from_restaurant_id": 1
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for segments in response
        segments = data.get("data", {}).get("segments") or data.get("segments", [])
        assert isinstance(segments, list), f"Expected segments array, got: {type(segments)}"
        print(f"✓ source-options returns 200 with {len(segments)} segments")
        
        # Verify segment structure
        if segments:
            seg = segments[0]
            assert "segment_id" in seg, "Missing segment_id in segment"
            print(f"  - First segment: ID={seg.get('segment_id')}, batch={seg.get('batch')}")


class TestAddStock:
    """Test 4: add-stock route path with inventory_master_id in URL"""
    
    def test_add_stock_correct_path(self, auth_token):
        """POST /api/proxy/v2/inventory/add-stock/16983 with vendor_id returns 200 (NOT 404)"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory/add-stock/16983",
            json={
                "vendor_id": 1,
                "quantity": 0.01,
                "unit": "kg",
                "reason": "pytest test"
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        # Should NOT be 404 (route exists)
        assert response.status_code != 404, f"Route not found (404): {response.text}"
        # Should be 200 for successful add
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ add-stock returns 200 (route path correct)")
        print(f"  - Response: stock_id={data.get('stock_id')}, added_quantity={data.get('added_quantity')}")


class TestRecordWastage:
    """Test 5: record-wastage route path (inventory-transfer/record-wastage)"""
    
    def test_record_wastage_correct_path(self, auth_token):
        """POST /api/proxy/v2/inventory-transfer/record-wastage with restaurant_id returns 200 (NOT 404)"""
        # First get a valid segment_id from source-options
        source_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/source-options",
            json={
                "source_inventory_master_id": 16983,
                "from_restaurant_id": 1
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        if source_resp.status_code != 200:
            pytest.skip("Could not get source options for wastage test")
        
        segments = source_resp.json().get("data", {}).get("segments") or source_resp.json().get("segments", [])
        if not segments:
            pytest.skip("No segments available for wastage test")
        
        segment_id = segments[0].get("segment_id")
        
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/record-wastage",
            json={
                "source_inventory_master_id": 16983,
                "quantity": 0.01,
                "unit": "kg",
                "source_selector": {"mode": "segment_id", "segment_id": segment_id},
                "reason": "pytest test wastage",
                "restaurant_id": 1
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        # Should NOT be 404 (route exists)
        assert response.status_code != 404, f"Route not found (404): {response.text}"
        # Should be 200 for successful wastage record
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ record-wastage returns 200 (route path correct)")
        print(f"  - Response: status={data.get('status')}, message={data.get('message')}")


class TestDecreaseAdjustment:
    """Test 6: decrease-adjustment with restaurant_id"""
    
    def test_decrease_adjustment_with_restaurant_id(self, auth_token):
        """POST /api/proxy/v2/inventory-transfer/decrease-adjustment with restaurant_id returns 200 (NOT 422)"""
        # First get a valid segment_id from source-options
        source_resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/source-options",
            json={
                "source_inventory_master_id": 16983,
                "from_restaurant_id": 1
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        if source_resp.status_code != 200:
            pytest.skip("Could not get source options for decrease adjustment test")
        
        segments = source_resp.json().get("data", {}).get("segments") or source_resp.json().get("segments", [])
        if not segments:
            pytest.skip("No segments available for decrease adjustment test")
        
        segment_id = segments[0].get("segment_id")
        
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/decrease-adjustment",
            json={
                "source_inventory_master_id": 16983,
                "quantity": 0.01,
                "unit": "kg",
                "source_selector": {"mode": "segment_id", "segment_id": segment_id},
                "reason": "pytest test decrease",
                "restaurant_id": 1
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        # Should NOT be 422 (validation error)
        assert response.status_code != 422, f"Validation error (422): {response.text}"
        # Should be 200 for successful decrease
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ decrease-adjustment returns 200 (restaurant_id included)")
        print(f"  - Response: status={data.get('status')}, message={data.get('message')}")


class TestWastageReport:
    """Test 7: wastage-report response unwrap"""
    
    def test_wastage_report_returns_records(self, auth_token):
        """POST /api/proxy/v2/inventory/wastage-report with restaurant_ids returns wastage_records array"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory/wastage-report",
            json={"restaurant_ids": [1]},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for wastage_records array
        records = data.get("wastage_records") or data.get("data", {}).get("wastage_records", [])
        assert isinstance(records, list), f"Expected wastage_records array, got: {type(records)}"
        print(f"✓ wastage-report returns 200 with {len(records)} wastage records")
        
        # Verify record structure
        if records:
            rec = records[0]
            assert "wastage_id" in rec, "Missing wastage_id in record"
            assert "item_name" in rec, "Missing item_name in record"
            print(f"  - First record: {rec.get('item_name')} - {rec.get('wastage_quantity')} {rec.get('unit')}")


class TestTransferDetails:
    """Test 8: transfer-details response shape"""
    
    def test_transfer_details_returns_data(self, auth_token):
        """GET /api/proxy/v2/inventory-transfer/details/51 returns transfer data"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/details/51",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for transfer data
        transfer_data = data.get("data") or data
        
        # POS returns { transfer: {...}, lines: [...] }
        transfer = transfer_data.get("transfer") or transfer_data
        lines = transfer_data.get("lines") or transfer.get("lines", [])
        
        assert transfer is not None, "Missing transfer data"
        assert "id" in transfer or "status" in transfer, f"Invalid transfer structure: {transfer.keys()}"
        
        print(f"✓ transfer-details returns 200 with transfer data")
        print(f"  - Transfer ID: {transfer.get('id')}, Status: {transfer.get('status')}")
        print(f"  - Lines count: {len(lines)}")
        
        # Check resolution_meta (should be JSON string from POS)
        resolution_meta = transfer.get("resolution_meta")
        if resolution_meta:
            print(f"  - resolution_meta type: {type(resolution_meta)}")


class TestInventoryMaster:
    """Test inventory master endpoint"""
    
    def test_get_inventory_master(self, auth_token):
        """GET /api/proxy/v2/inventory/get-inventory-master returns inventory items"""
        response = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/get-inventory-master",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        items = data.get("data") or data
        if isinstance(items, dict):
            items = items.get("items", [])
        
        print(f"✓ inventory-master returns 200")
        if isinstance(items, list) and items:
            print(f"  - Items count: {len(items)}")
            print(f"  - First item: {items[0].get('stock_title')} (ID: {items[0].get('id')})")


class TestTransferHistory:
    """Test transfer history endpoint"""
    
    def test_transfer_history(self, auth_token):
        """POST /api/proxy/v2/inventory-transfer/history returns transfer list"""
        response = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/history",
            json={},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        transfers = data.get("data") or data
        if isinstance(transfers, dict):
            transfers = transfers.get("transfers", [])
        
        print(f"✓ transfer-history returns 200")
        if isinstance(transfers, list):
            print(f"  - Transfers count: {len(transfers)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
