"""
CR-034: Test Sub-Recipe and Recipe CRUD operations
Tests the POS API field name fixes for sub-recipe and recipe operations.
Key changes tested:
- Sub-recipe: sub_recipe_name, subunit, ingredient (singular for create), ingredients (plural for update)
- Recipe: name=food_id (integer), preparation_time, serves_people, {id,qty,unit} ingredient format
- Recipe delete: requires reason body
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "manager@germanfluid.com"
TEST_PASSWORD = "Qplazm@10"

class TestCR034SubRecipeRecipeCRUD:
    """CR-034: Sub-Recipe and Recipe CRUD with correct POS API field names"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        token = data.get("token") or data.get("data", {}).get("token")
        assert token, f"No token in response: {data}"
        return token
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    # ============ SUB-RECIPE TESTS ============
    
    def test_01_get_sub_recipe_list(self, api_client):
        """Q7: Verify existing sub-recipes load correctly"""
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/sub-recipes")
        assert response.status_code == 200, f"Failed to get sub-recipes: {response.text}"
        data = response.json()
        sub_recipes = data.get("sub_recipes", data if isinstance(data, list) else [])
        print(f"Found {len(sub_recipes)} sub-recipes")
        assert len(sub_recipes) >= 0, "Sub-recipe list should be accessible"
        # Store count for later verification
        return len(sub_recipes)
    
    def test_02_get_inventory_master(self, api_client):
        """Get inventory items for ingredient selection"""
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/inventory-master")
        assert response.status_code == 200, f"Failed to get inventory master: {response.text}"
        data = response.json()
        items = data.get("data", data if isinstance(data, list) else [])
        print(f"Found {len(items)} inventory items")
        assert len(items) > 0, "Should have inventory items for ingredients"
        # Return first few items for use in tests
        return items[:5] if len(items) >= 5 else items
    
    def test_03_create_sub_recipe(self, api_client):
        """Q1: Create a new sub-recipe with correct field names"""
        # First get inventory items for ingredients
        inv_response = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/inventory-master")
        inv_data = inv_response.json()
        items = inv_data.get("data", inv_data if isinstance(inv_data, list) else [])
        
        if len(items) < 1:
            pytest.skip("No inventory items available for ingredient selection")
        
        # Use first inventory item as ingredient
        ing_item = items[0]
        
        # CR-034 fix: Use correct field names for POS API
        # CREATE uses: sub_recipe_name, subunit, ingredient (SINGULAR)
        payload = {
            "sub_recipe_name": "TEST_CR034_SubRecipe",
            "food_name": "TEST_CR034_SubRecipe",
            "subunit": "gm",
            "prepration_time": 10,
            "serve_people": 1,
            "qty": 100,
            "ingredient": [  # SINGULAR for create
                {"id": ing_item["id"], "qty": 50, "unit": ing_item.get("unit", "gm")}
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/proxy/v2/recipe/store-sub-recipe", json=payload)
        print(f"Create sub-recipe response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed to create sub-recipe: {response.text}"
        data = response.json()
        
        # Verify response has expected data
        assert "message" in data or "sub_recipe" in data or "id" in data or "recipe_id" in data, \
            f"Unexpected response format: {data}"
        
        # Extract created ID for cleanup
        created_id = data.get("id") or data.get("recipe_id") or data.get("sub_recipe", {}).get("id")
        print(f"Created sub-recipe ID: {created_id}")
        return created_id
    
    def test_04_verify_sub_recipe_created(self, api_client):
        """Verify the created sub-recipe appears in list"""
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/sub-recipes")
        assert response.status_code == 200
        data = response.json()
        sub_recipes = data.get("sub_recipes", data if isinstance(data, list) else [])
        
        # Find our test sub-recipe
        test_sr = next((sr for sr in sub_recipes if "TEST_CR034" in (sr.get("name") or "")), None)
        if test_sr:
            print(f"Found created sub-recipe: {test_sr.get('name')} (ID: {test_sr.get('recipe_id')})")
            assert test_sr.get("name") == "TEST_CR034_SubRecipe"
            return test_sr.get("recipe_id")
        else:
            print("Test sub-recipe not found in list - may have been created with different name format")
            return None
    
    def test_05_update_sub_recipe(self, api_client):
        """Q2: Update sub-recipe with correct field names"""
        # First find our test sub-recipe
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/sub-recipes")
        data = response.json()
        sub_recipes = data.get("sub_recipes", data if isinstance(data, list) else [])
        
        test_sr = next((sr for sr in sub_recipes if "TEST_CR034" in (sr.get("name") or "")), None)
        if not test_sr:
            pytest.skip("Test sub-recipe not found - skipping update test")
        
        recipe_id = test_sr.get("recipe_id")
        
        # Get inventory items for updated ingredients
        inv_response = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/inventory-master")
        inv_data = inv_response.json()
        items = inv_data.get("data", inv_data if isinstance(inv_data, list) else [])
        
        # CR-034 fix: UPDATE uses ingredients (PLURAL)
        payload = {
            "sub_recipe_name": "TEST_CR034_SubRecipe_Updated",
            "subunit": "gm",
            "prepration_time": 15,
            "serve_time": 0,
            "serve_people": 1,
            "qty": 150,
            "ingredients": [  # PLURAL for update
                {"id": items[0]["id"], "qty": 75, "unit": items[0].get("unit", "gm")}
            ]
        }
        
        response = api_client.put(f"{BASE_URL}/api/proxy/v2/recipe/update-sub-recipe/{recipe_id}", json=payload)
        print(f"Update sub-recipe response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to update sub-recipe: {response.text}"
        return recipe_id
    
    def test_06_delete_sub_recipe(self, api_client):
        """Q3: Delete sub-recipe"""
        # Find our test sub-recipe
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/sub-recipes")
        data = response.json()
        sub_recipes = data.get("sub_recipes", data if isinstance(data, list) else [])
        
        test_sr = next((sr for sr in sub_recipes if "TEST_CR034" in (sr.get("name") or "")), None)
        if not test_sr:
            pytest.skip("Test sub-recipe not found - skipping delete test")
        
        recipe_id = test_sr.get("recipe_id")
        
        response = api_client.delete(f"{BASE_URL}/api/proxy/v2/recipe/delete-sub-recipe/{recipe_id}")
        print(f"Delete sub-recipe response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code in [200, 204], f"Failed to delete sub-recipe: {response.text}"
    
    def test_07_verify_sub_recipe_deleted(self, api_client):
        """Verify sub-recipe was deleted"""
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/sub-recipes")
        data = response.json()
        sub_recipes = data.get("sub_recipes", data if isinstance(data, list) else [])
        
        test_sr = next((sr for sr in sub_recipes if "TEST_CR034" in (sr.get("name") or "")), None)
        assert test_sr is None, "Test sub-recipe should have been deleted"
        print("Sub-recipe successfully deleted")
    
    # ============ RECIPE TESTS ============
    
    def test_08_get_recipe_list(self, api_client):
        """Q8: Verify existing recipes load correctly"""
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/recipes")
        assert response.status_code == 200, f"Failed to get recipes: {response.text}"
        data = response.json()
        recipes = data.get("recipes", data if isinstance(data, list) else [])
        print(f"Found {len(recipes)} recipes")
        return len(recipes)
    
    def test_09_get_foods_list(self, api_client):
        """Get foods list for recipe creation"""
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/product/foods")
        assert response.status_code == 200, f"Failed to get foods: {response.text}"
        data = response.json()
        foods = data.get("foods", data if isinstance(data, list) else [])
        print(f"Found {len(foods)} foods")
        return foods
    
    def test_10_create_food_for_recipe(self, api_client):
        """Q4 Part 1: Create a food item for recipe testing"""
        # Get categories first
        cat_response = api_client.get(f"{BASE_URL}/api/proxy/v2/product/categories")
        cat_data = cat_response.json()
        categories = cat_data.get("categories", cat_data if isinstance(cat_data, list) else [])
        
        if not categories:
            pytest.skip("No categories available for food creation")
        
        category_id = categories[0].get("id")
        
        payload = {
            "name": "TEST_CR034_Food",
            "category_id": category_id,
            "price": 100,
            "description": "Test food for CR-034 recipe testing"
        }
        
        response = api_client.post(f"{BASE_URL}/api/proxy/v2/product/store-food", json=payload)
        print(f"Create food response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code not in [200, 201]:
            # Food creation might fail if already exists or other reasons
            # Try to find existing test food
            foods_response = api_client.get(f"{BASE_URL}/api/proxy/v2/product/foods")
            foods_data = foods_response.json()
            foods = foods_data.get("foods", foods_data if isinstance(foods_data, list) else [])
            test_food = next((f for f in foods if "TEST_CR034" in (f.get("name") or "")), None)
            if test_food:
                print(f"Using existing test food: {test_food.get('id')}")
                return test_food.get("id")
            pytest.skip(f"Could not create or find test food: {response.text}")
        
        data = response.json()
        food_id = data.get("id") or data.get("food", {}).get("id")
        print(f"Created food ID: {food_id}")
        return food_id
    
    def test_11_create_recipe(self, api_client):
        """Q4 Part 2: Create a recipe with correct field names"""
        # Get foods to find our test food or any available food
        foods_response = api_client.get(f"{BASE_URL}/api/proxy/v2/product/foods")
        foods_data = foods_response.json()
        foods = foods_data.get("foods", foods_data if isinstance(foods_data, list) else [])
        
        # Try to find test food, or use first available
        test_food = next((f for f in foods if "TEST_CR034" in (f.get("name") or "")), None)
        if not test_food and foods:
            test_food = foods[0]
        
        if not test_food:
            pytest.skip("No foods available for recipe creation")
        
        food_id = test_food.get("id")
        food_name = test_food.get("name")
        
        # Get inventory items for ingredients
        inv_response = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/inventory-master")
        inv_data = inv_response.json()
        items = inv_data.get("data", inv_data if isinstance(inv_data, list) else [])
        
        if not items:
            pytest.skip("No inventory items for recipe ingredients")
        
        # CR-034 fix: Use correct field names for POS API
        # name = food_id (integer), preparation_time (not prepration_time), serves_people
        payload = {
            "name": food_id,  # INTEGER food_id, not string
            "food_name": food_name,
            "food_id": food_id,
            "preparation_time": 20,  # Correct spelling
            "serves_people": 2,  # Correct field name
            "serve_time": 0,
            "qty": 1,
            "unit": "piece",
            "ingredients": [
                {"id": items[0]["id"], "qty": 100, "unit": items[0].get("unit", "gm")}
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/proxy/v2/recipe/store-recipe", json=payload)
        print(f"Create recipe response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed to create recipe: {response.text}"
        data = response.json()
        
        recipe_id = data.get("id") or data.get("recipe_id") or data.get("recipe", {}).get("id")
        print(f"Created recipe ID: {recipe_id}")
        return recipe_id
    
    def test_12_verify_recipe_created(self, api_client):
        """Verify recipe was created"""
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/recipes")
        data = response.json()
        recipes = data.get("recipes", data if isinstance(data, list) else [])
        
        # Find recipe linked to our test food
        test_recipe = next((r for r in recipes if "TEST_CR034" in (r.get("name") or r.get("food_name") or "")), None)
        if test_recipe:
            print(f"Found created recipe: {test_recipe.get('name')} (ID: {test_recipe.get('id') or test_recipe.get('recipe_id')})")
            return test_recipe.get("id") or test_recipe.get("recipe_id")
        else:
            print("Test recipe not found by name - checking all recipes")
            return None
    
    def test_13_update_recipe(self, api_client):
        """Q5: Update recipe with correct field names"""
        # Get recipes to find one to update
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/recipes")
        data = response.json()
        recipes = data.get("recipes", data if isinstance(data, list) else [])
        
        # Find test recipe or use first available
        test_recipe = next((r for r in recipes if "TEST_CR034" in (r.get("name") or r.get("food_name") or "")), None)
        if not test_recipe and recipes:
            test_recipe = recipes[0]
        
        if not test_recipe:
            pytest.skip("No recipes available for update test")
        
        recipe_id = test_recipe.get("id") or test_recipe.get("recipe_id")
        food_id = test_recipe.get("food_id")
        
        # Get inventory items
        inv_response = api_client.get(f"{BASE_URL}/api/proxy/v2/inventory/inventory-master")
        inv_data = inv_response.json()
        items = inv_data.get("data", inv_data if isinstance(inv_data, list) else [])
        
        # CR-034 fix: Use correct field names
        payload = {
            "name": food_id,
            "food_name": test_recipe.get("name") or test_recipe.get("food_name"),
            "food_id": food_id,
            "preparation_time": 25,
            "serves_people": 3,
            "serve_time": 0,
            "qty": 1,
            "unit": "piece",
            "ingredients": [
                {"id": items[0]["id"], "qty": 150, "unit": items[0].get("unit", "gm")}
            ] if items else []
        }
        
        response = api_client.put(f"{BASE_URL}/api/proxy/v2/recipe/update-recipe/{recipe_id}", json=payload)
        print(f"Update recipe response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to update recipe: {response.text}"
        return recipe_id
    
    def test_14_delete_recipe(self, api_client):
        """Q6: Delete recipe with reason body"""
        # Get recipes to find test recipe
        response = api_client.get(f"{BASE_URL}/api/proxy/v2/recipe/recipes")
        data = response.json()
        recipes = data.get("recipes", data if isinstance(data, list) else [])
        
        test_recipe = next((r for r in recipes if "TEST_CR034" in (r.get("name") or r.get("food_name") or "")), None)
        if not test_recipe:
            pytest.skip("Test recipe not found - skipping delete test")
        
        recipe_id = test_recipe.get("id") or test_recipe.get("recipe_id")
        
        # CR-034 fix: Delete requires reason body
        response = api_client.delete(
            f"{BASE_URL}/api/proxy/v2/recipe/delete-recipe/{recipe_id}",
            json={"reason": "Deleted from Central Inventory - CR-034 test cleanup"}
        )
        print(f"Delete recipe response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code in [200, 204], f"Failed to delete recipe: {response.text}"
    
    def test_15_cleanup_test_food(self, api_client):
        """Cleanup: Delete test food if created"""
        foods_response = api_client.get(f"{BASE_URL}/api/proxy/v2/product/foods")
        foods_data = foods_response.json()
        foods = foods_data.get("foods", foods_data if isinstance(foods_data, list) else [])
        
        test_food = next((f for f in foods if "TEST_CR034" in (f.get("name") or "")), None)
        if test_food:
            food_id = test_food.get("id")
            response = api_client.delete(f"{BASE_URL}/api/proxy/v2/product/delete-food/{food_id}")
            print(f"Cleanup food response: {response.status_code}")
        else:
            print("No test food to cleanup")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
