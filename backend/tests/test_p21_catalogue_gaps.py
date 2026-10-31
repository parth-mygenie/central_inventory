"""
P21 Catalogue Gaps Testing - Food Categories, Addons, and Ingredient Rename
Tests GAP-A (Food Categories CRUD), GAP-B (Addons CRUD), GAP-C (Ingredient Rename)

CRITICAL ROUTE QUIRKS:
- Food category update: POST /product/update-categories/{id} (NOT PUT)
- Addon update: PUT /product/addon-update/{id} (noun-verb, NOT update-addon)
- Addon delete: DELETE /product/delete-addon/{id}
- Food category delete: DELETE /product/delete-categories/{id}
- Ingredient rename: PUT /inventory/update-stock/{id} with stock_title field
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment (never hardcode secrets)
MASTER_EMAIL = os.environ.get('TEST_MASTER_EMAIL', 'abhishek@kalabahia.com')
MASTER_PASSWORD = os.environ.get('TEST_PASSWORD', '')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for master user"""
    resp = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
        "email": MASTER_EMAIL,
        "password": MASTER_PASSWORD,
        "fcm_token": "test_token"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("data", {}).get("token")
    assert token, "No token in login response"
    return token


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ═══════════════════════════════════════════════════════════════════
# GAP-A: Food Categories CRUD Tests
# ═══════════════════════════════════════════════════════════════════

class TestFoodCategoriesCRUD:
    """GAP-A: Food Categories full CRUD tests"""
    
    created_category_id = None
    
    def test_gap_a1_get_food_categories(self, api_client):
        """GAP-A1: Verify food categories list endpoint works"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/categories")
        assert resp.status_code == 200, f"Get categories failed: {resp.text}"
        data = resp.json()
        # Should be an array
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Found {len(data)} food categories")
    
    def test_gap_a2_create_food_category(self, api_client):
        """GAP-A2: Create food category via POST /product/add-categories"""
        payload = {
            "name": "TEST_Category_P21_Gaps",
            "cat_type": "food"
        }
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/product/add-categories", json=payload)
        # 200 or 201 for success
        assert resp.status_code in [200, 201], f"Create category failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        # Extract ID from response - POS returns {message, category_id}
        cat_id = data.get("category_id") or data.get("id") or data.get("category", {}).get("id") or data.get("data", {}).get("id")
        assert cat_id, f"No category ID in response: {data}"
        TestFoodCategoriesCRUD.created_category_id = cat_id
        print(f"Created food category with ID: {cat_id}")
    
    def test_gap_a3_verify_category_in_list(self, api_client):
        """Verify created category appears in list"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/categories")
        assert resp.status_code == 200
        data = resp.json()
        found = any(c.get("name") == "TEST_Category_P21_Gaps" for c in data)
        assert found, "Created category not found in list"
        print("Created category verified in list")
    
    def test_gap_a4_update_food_category(self, api_client):
        """GAP-A3: Update food category via POST /product/update-categories/{id} (NOTE: POST not PUT)"""
        cat_id = TestFoodCategoriesCRUD.created_category_id
        if not cat_id:
            pytest.skip("No category ID from create test")
        
        payload = {"name": "TEST_Category_P21_Gaps_Updated"}
        # CRITICAL: POS uses POST not PUT for this route
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/product/update-categories/{cat_id}", json=payload)
        assert resp.status_code == 200, f"Update category failed: {resp.status_code} - {resp.text}"
        print(f"Updated food category {cat_id}")
    
    def test_gap_a5_verify_update_persisted(self, api_client):
        """Verify category update persisted"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/categories")
        assert resp.status_code == 200
        data = resp.json()
        found = any(c.get("name") == "TEST_Category_P21_Gaps_Updated" for c in data)
        assert found, "Updated category name not found in list"
        print("Category update verified")
    
    def test_gap_a6_duplicate_category_error(self, api_client):
        """GAP-A5: Duplicate food category name shows error (400)"""
        # Try to create another category with same name as existing "toast" category
        payload = {"name": "toast", "cat_type": "food"}
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/product/add-categories", json=payload)
        # Should return 400 for duplicate
        assert resp.status_code == 400, f"Expected 400 for duplicate, got {resp.status_code}"
        data = resp.json()
        # Should have error field
        assert "error" in data or "message" in data, f"No error message in response: {data}"
        print(f"Duplicate category correctly rejected with 400: {data}")
    
    def test_gap_a7_delete_food_category(self, api_client):
        """GAP-A4: Delete food category via DELETE /product/delete-categories/{id}"""
        cat_id = TestFoodCategoriesCRUD.created_category_id
        if not cat_id:
            pytest.skip("No category ID from create test")
        
        resp = api_client.delete(f"{BASE_URL}/api/proxy/v2/product/delete-categories/{cat_id}")
        assert resp.status_code == 200, f"Delete category failed: {resp.status_code} - {resp.text}"
        print(f"Deleted food category {cat_id}")
    
    def test_gap_a8_verify_deletion(self, api_client):
        """Verify category deletion"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/categories")
        assert resp.status_code == 200
        data = resp.json()
        found = any(c.get("name") == "TEST_Category_P21_Gaps_Updated" for c in data)
        assert not found, "Deleted category still in list"
        print("Category deletion verified")


# ═══════════════════════════════════════════════════════════════════
# GAP-B: Addons CRUD Tests
# ═══════════════════════════════════════════════════════════════════

class TestAddonsCRUD:
    """GAP-B: Addons full CRUD tests"""
    
    created_addon_id = None
    
    def test_gap_b1_get_addon_list(self, api_client):
        """GAP-B1: Verify addon list endpoint works"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/addon-list")
        assert resp.status_code == 200, f"Get addons failed: {resp.text}"
        data = resp.json()
        # Response has addons array
        addons = data.get("addons", data)
        assert isinstance(addons, list), f"Expected list, got {type(addons)}"
        print(f"Found {len(addons)} addons")
    
    def test_gap_b2_create_addon(self, api_client):
        """GAP-B2: Create addon via POST /product/add-addon → 201"""
        payload = {
            "name": "TEST_Addon_P21",
            "price": 25
        }
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/product/add-addon", json=payload)
        assert resp.status_code == 201, f"Create addon failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        # Extract ID
        addon_id = data.get("id") or data.get("addon", {}).get("id") or data.get("data", {}).get("id")
        assert addon_id, f"No addon ID in response: {data}"
        TestAddonsCRUD.created_addon_id = addon_id
        print(f"Created addon with ID: {addon_id}")
    
    def test_gap_b3_verify_addon_in_list(self, api_client):
        """Verify created addon appears in list"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/addon-list")
        assert resp.status_code == 200
        data = resp.json()
        addons = data.get("addons", data)
        found = any(a.get("name") == "TEST_Addon_P21" for a in addons)
        assert found, "Created addon not found in list"
        print("Created addon verified in list")
    
    def test_gap_b4_update_addon(self, api_client):
        """GAP-B3: Update addon via PUT /product/addon-update/{id} (noun-verb route)"""
        addon_id = TestAddonsCRUD.created_addon_id
        if not addon_id:
            pytest.skip("No addon ID from create test")
        
        payload = {"name": "TEST_Addon_P21_Updated", "price": 30}
        # CRITICAL: route is addon-update (noun-verb), NOT update-addon
        resp = api_client.put(f"{BASE_URL}/api/proxy/v2/product/addon-update/{addon_id}", json=payload)
        assert resp.status_code == 200, f"Update addon failed: {resp.status_code} - {resp.text}"
        print(f"Updated addon {addon_id}")
    
    def test_gap_b5_verify_update_persisted(self, api_client):
        """Verify addon update persisted"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/addon-list")
        assert resp.status_code == 200
        data = resp.json()
        addons = data.get("addons", data)
        found_addon = next((a for a in addons if a.get("name") == "TEST_Addon_P21_Updated"), None)
        assert found_addon, "Updated addon name not found in list"
        assert found_addon.get("price") == 30 or str(found_addon.get("price")) == "30", f"Price not updated: {found_addon}"
        print("Addon update verified")
    
    def test_gap_b6_duplicate_addon_error(self, api_client):
        """GAP-B5: Duplicate addon name shows error (409)"""
        # Try to create another addon with same name
        payload = {"name": "TEST_Addon_P21_Updated", "price": 50}
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/product/add-addon", json=payload)
        # Should return 409 for duplicate
        assert resp.status_code == 409, f"Expected 409 for duplicate, got {resp.status_code}"
        data = resp.json()
        # Should have errors array with message
        assert "errors" in data or "message" in data, f"No error in response: {data}"
        print(f"Duplicate addon correctly rejected with 409: {data}")
    
    def test_gap_b7_addon_validation_error(self, api_client):
        """Test addon validation - missing required fields returns 422"""
        payload = {"name": ""}  # Empty name, missing price
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/product/add-addon", json=payload)
        # Should return 422 for validation error
        assert resp.status_code == 422, f"Expected 422 for validation, got {resp.status_code}"
        print(f"Validation error correctly returned: {resp.json()}")
    
    def test_gap_b8_delete_addon(self, api_client):
        """GAP-B4: Delete addon via DELETE /product/delete-addon/{id}"""
        addon_id = TestAddonsCRUD.created_addon_id
        if not addon_id:
            pytest.skip("No addon ID from create test")
        
        resp = api_client.delete(f"{BASE_URL}/api/proxy/v2/product/delete-addon/{addon_id}")
        assert resp.status_code == 200, f"Delete addon failed: {resp.status_code} - {resp.text}"
        print(f"Deleted addon {addon_id}")
    
    def test_gap_b9_verify_deletion(self, api_client):
        """Verify addon deletion"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/addon-list")
        assert resp.status_code == 200
        data = resp.json()
        addons = data.get("addons", data)
        found = any(a.get("name") == "TEST_Addon_P21_Updated" for a in addons)
        assert not found, "Deleted addon still in list"
        print("Addon deletion verified")


# ═══════════════════════════════════════════════════════════════════
# GAP-C: Ingredient Rename Tests
# ═══════════════════════════════════════════════════════════════════

class TestIngredientRename:
    """GAP-C: Ingredient rename support tests"""
    
    test_ingredient_id = None
    original_name = None
    
    def test_gap_c1_get_stock_inventory(self, api_client):
        """Get stock inventory to find a test ingredient"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory")
        assert resp.status_code == 200, f"Get stock inventory failed: {resp.text}"
        data = resp.json()
        stocks = data.get("current_stocks", [])
        assert len(stocks) > 0, "No stocks found"
        
        # Use first ingredient for testing
        test_item = stocks[0]
        TestIngredientRename.test_ingredient_id = test_item.get("id")
        TestIngredientRename.original_name = test_item.get("stock_title")
        print(f"Test ingredient: {TestIngredientRename.original_name} (ID: {TestIngredientRename.test_ingredient_id})")
    
    def test_gap_c2_update_ingredient_with_stock_title(self, api_client):
        """GAP-C3: Update ingredient name via PUT /inventory/update-stock/{id} with stock_title"""
        ing_id = TestIngredientRename.test_ingredient_id
        original = TestIngredientRename.original_name
        if not ing_id:
            pytest.skip("No ingredient ID from previous test")
        
        # Rename to test name
        payload = {"stock_title": f"{original}_RENAMED"}
        resp = api_client.put(f"{BASE_URL}/api/proxy/v2/inventory/update-stock/{ing_id}", json=payload)
        assert resp.status_code == 200, f"Update stock failed: {resp.status_code} - {resp.text}"
        print(f"Renamed ingredient to: {original}_RENAMED")
    
    def test_gap_c3_verify_rename_persisted(self, api_client):
        """Verify ingredient rename persisted"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory")
        assert resp.status_code == 200
        data = resp.json()
        stocks = data.get("current_stocks", [])
        
        ing_id = TestIngredientRename.test_ingredient_id
        original = TestIngredientRename.original_name
        
        found = next((s for s in stocks if s.get("id") == ing_id), None)
        assert found, f"Ingredient {ing_id} not found"
        assert found.get("stock_title") == f"{original}_RENAMED", f"Name not updated: {found.get('stock_title')}"
        print("Ingredient rename verified")
    
    def test_gap_c4_revert_ingredient_name(self, api_client):
        """Revert ingredient name back to original (cleanup)"""
        ing_id = TestIngredientRename.test_ingredient_id
        original = TestIngredientRename.original_name
        if not ing_id or not original:
            pytest.skip("No ingredient data from previous tests")
        
        payload = {"stock_title": original}
        resp = api_client.put(f"{BASE_URL}/api/proxy/v2/inventory/update-stock/{ing_id}", json=payload)
        assert resp.status_code == 200, f"Revert stock name failed: {resp.status_code} - {resp.text}"
        print(f"Reverted ingredient name to: {original}")
    
    def test_gap_c5_verify_revert(self, api_client):
        """Verify ingredient name reverted"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory")
        assert resp.status_code == 200
        data = resp.json()
        stocks = data.get("current_stocks", [])
        
        ing_id = TestIngredientRename.test_ingredient_id
        original = TestIngredientRename.original_name
        
        found = next((s for s in stocks if s.get("id") == ing_id), None)
        assert found, f"Ingredient {ing_id} not found"
        assert found.get("stock_title") == original, f"Name not reverted: {found.get('stock_title')}"
        print("Ingredient name revert verified")


# ═══════════════════════════════════════════════════════════════════
# REGRESSION Tests
# ═══════════════════════════════════════════════════════════════════

class TestRegression:
    """Regression tests for existing functionality"""
    
    def test_regression_1_recipe_list(self, api_client):
        """REGRESSION-1: Recipe page still loads correctly"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/get-recipe")
        assert resp.status_code == 200, f"Get recipes failed: {resp.text}"
        data = resp.json()
        recipes = data.get("recipes", [])
        assert isinstance(recipes, list), f"Expected list, got {type(recipes)}"
        print(f"Recipe list works: {len(recipes)} recipes")
    
    def test_regression_2_addon_recipe_list(self, api_client):
        """REGRESSION-2: Addon recipe page still loads correctly"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/addon-recipe-list")
        assert resp.status_code == 200, f"Get addon recipes failed: {resp.text}"
        data = resp.json()
        recipes = data.get("recipes", [])
        assert isinstance(recipes, list), f"Expected list, got {type(recipes)}"
        print(f"Addon recipe list works: {len(recipes)} addon recipes")
    
    def test_regression_3_operations_hub(self, api_client):
        """REGRESSION-3: Operations Hub endpoints still work"""
        # Test hierarchy summary
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/inventory-transfer/hierarchy-summary", 
                               json={"store_type": "franchise"})
        assert resp.status_code == 200, f"Hierarchy summary failed: {resp.text}"
        print("Operations Hub hierarchy-summary works")
    
    def test_regression_4_foods_list(self, api_client):
        """Verify foods list still works"""
        resp = api_client.get(f"{BASE_URL}/api/proxy/v2/product/foods-list")
        assert resp.status_code == 200, f"Get foods failed: {resp.text}"
        data = resp.json()
        foods = data.get("foods", [])
        assert isinstance(foods, list), f"Expected list, got {type(foods)}"
        print(f"Foods list works: {len(foods)} foods")


# ═══════════════════════════════════════════════════════════════════
# Error Handling Tests
# ═══════════════════════════════════════════════════════════════════

class TestErrorHandling:
    """Test error handling for invalid operations"""
    
    def test_update_nonexistent_category(self, api_client):
        """Update non-existent category returns 404"""
        resp = api_client.post(f"{BASE_URL}/api/proxy/v2/product/update-categories/99999", 
                               json={"name": "test"})
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Non-existent category update correctly returns 404")
    
    def test_delete_nonexistent_category(self, api_client):
        """Delete non-existent category returns 404"""
        resp = api_client.delete(f"{BASE_URL}/api/proxy/v2/product/delete-categories/99999")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Non-existent category delete correctly returns 404")
    
    def test_update_nonexistent_addon(self, api_client):
        """Update non-existent addon returns 404"""
        resp = api_client.put(f"{BASE_URL}/api/proxy/v2/product/addon-update/99999", 
                              json={"name": "test", "price": 10})
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Non-existent addon update correctly returns 404")
    
    def test_delete_nonexistent_addon(self, api_client):
        """Delete non-existent addon returns 404"""
        resp = api_client.delete(f"{BASE_URL}/api/proxy/v2/product/delete-addon/99999")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Non-existent addon delete correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
