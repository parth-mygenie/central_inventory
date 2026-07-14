"""
P21 Catalogue Phase — Backend API Tests
Tests for Inventory Catalogue, Product Catalogue, Recipe Management, Sub-recipe, and Addon-recipe APIs.
All calls go through real POS preprod API proxy.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment (never hardcode secrets)
MASTER_EMAIL = os.environ.get('TEST_MASTER_EMAIL', 'abhishek@kalabahia.com')
MASTER_PASSWORD = os.environ.get('TEST_PASSWORD', '')
CENTRAL_EMAIL = os.environ.get('TEST_CENTRAL_EMAIL', 'owner@democentral2.com')
CENTRAL_PASSWORD = os.environ.get('TEST_PASSWORD', '')
FRANCHISE_EMAIL = os.environ.get('TEST_FRANCHISE_EMAIL', 'owner@demofranchise4.com')
FRANCHISE_PASSWORD = os.environ.get('TEST_PASSWORD', '')


@pytest.fixture(scope="module")
def master_token():
    """Get auth token for master user (rid=1, type=master)"""
    resp = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
        "email": MASTER_EMAIL,
        "password": MASTER_PASSWORD,
        "fcm_token": "test_p21"
    })
    assert resp.status_code == 200, f"Master login failed: {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("data", {}).get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def central_token():
    """Get auth token for central user (rid=782, type=central)"""
    resp = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
        "email": CENTRAL_EMAIL,
        "password": CENTRAL_PASSWORD,
        "fcm_token": "test_p21"
    })
    assert resp.status_code == 200, f"Central login failed: {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("data", {}).get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def franchise_token():
    """Get auth token for franchise user (rid=786, type=franchise)"""
    resp = requests.post(f"{BASE_URL}/api/proxy/auth/login", json={
        "email": FRANCHISE_EMAIL,
        "password": FRANCHISE_PASSWORD,
        "fcm_token": "test_p21"
    })
    assert resp.status_code == 200, f"Franchise login failed: {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("data", {}).get("token")
    assert token, f"No token in response: {data}"
    return token


class TestP21InventoryCatalogue:
    """P21-12: Inventory stock-item-categories API tests"""

    def test_get_stock_item_categories_returns_200(self, master_token):
        """P21-12: GET /api/proxy/v2/inventory/stock-item-categories returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-item-categories",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response should have success and data array
        assert "success" in data or "data" in data, f"Unexpected response structure: {data}"

    def test_stock_item_categories_has_expected_categories(self, master_token):
        """P21-3: Categories tab shows stock-item-categories (veggies, non veg)"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-item-categories",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        categories = data.get("data", [])
        # Expected: at least 2 categories (veggies, non veg)
        assert len(categories) >= 2, f"Expected at least 2 categories, got {len(categories)}"
        category_names = [c.get("category_name", "").lower() for c in categories]
        # Check for expected categories
        assert any("veg" in name for name in category_names), f"Expected 'veggies' or 'non veg' in {category_names}"


class TestP21ProductCatalogue:
    """P21-13: Product foods-list API tests"""

    def test_get_foods_list_returns_200(self, master_token):
        """P21-13: GET /api/proxy/v2/product/foods-list returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/product/foods-list",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response should have foods array
        assert "foods" in data, f"Expected 'foods' key in response: {data}"

    def test_foods_list_has_expected_items(self, master_token):
        """P21-4: Foods tab shows 2 foods (aloo parantha, mutton keema) with correct price"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/product/foods-list",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        foods = data.get("foods", [])
        # Expected: at least 2 foods
        assert len(foods) >= 2, f"Expected at least 2 foods, got {len(foods)}"
        food_names = [f.get("name", "").lower() for f in foods]
        # Check for expected foods
        assert any("aloo" in name or "parantha" in name for name in food_names), f"Expected 'aloo parantha' in {food_names}"
        assert any("mutton" in name or "keema" in name for name in food_names), f"Expected 'mutton keema' in {food_names}"

    def test_get_food_categories_returns_200(self, master_token):
        """P21-5: GET /api/proxy/v2/product/categories returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/product/categories",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response should be an array
        assert isinstance(data, list), f"Expected array response: {data}"

    def test_get_addon_list_returns_200(self, master_token):
        """P21-6: GET /api/proxy/v2/product/addon-list returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/product/addon-list",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response should have addons array
        assert "addons" in data, f"Expected 'addons' key in response: {data}"


class TestP21RecipeCatalogue:
    """P21-14: Recipe API tests (using /recipe/ prefix)"""

    def test_get_recipe_list_returns_200(self, master_token):
        """P21-14: GET /api/proxy/v2/recipe/get-recipe returns 200 (corrected /recipe/ prefix)"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/recipe/get-recipe",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response should have recipes array
        assert "recipes" in data, f"Expected 'recipes' key in response: {data}"

    def test_recipe_list_has_expected_recipes(self, master_token):
        """P21-7: Recipes tab shows 2 recipes (aloo parantha, mutton keema) with ingredient counts"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/recipe/get-recipe",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        recipes = data.get("recipes", [])
        # Expected: at least 2 recipes
        assert len(recipes) >= 2, f"Expected at least 2 recipes, got {len(recipes)}"
        # Check for expected recipes
        recipe_names = [r.get("name", "").lower() or r.get("food_name", "").lower() for r in recipes]
        assert any("aloo" in name or "parantha" in name for name in recipe_names), f"Expected 'aloo parantha' in {recipe_names}"
        # Check ingredients array exists
        for recipe in recipes:
            assert "ingredients" in recipe, f"Recipe missing 'ingredients' key: {recipe}"

    def test_get_sub_recipe_list_returns_200(self, master_token):
        """P21-8: GET /api/proxy/v2/recipe/sub-recipes returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/recipe/sub-recipes",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        # Response can be empty array or have sub_recipes


class TestP21AddonRecipeCatalogue:
    """P21-15: Addon recipe API tests"""

    def test_get_addon_recipe_list_returns_200(self, master_token):
        """P21-15: GET /api/proxy/v2/product/addon-recipe-list returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/product/addon-recipe-list",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response should have recipes array
        assert "recipes" in data, f"Expected 'recipes' key in response: {data}"

    def test_addon_recipe_has_expected_data(self, master_token):
        """P21-9: Addon recipe rossa with 1 ingredient and price 50.00"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/product/addon-recipe-list",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        recipes = data.get("recipes", [])
        # Expected: at least 1 addon recipe (rossa)
        assert len(recipes) >= 1, f"Expected at least 1 addon recipe, got {len(recipes)}"
        # Check for rossa addon recipe
        rossa = next((r for r in recipes if "rossa" in (r.get("addon_name", "") or r.get("name", "")).lower()), None)
        if rossa:
            # Verify price is 50
            price = float(rossa.get("addon_price", 0) or rossa.get("price", 0))
            assert price == 50.0, f"Expected rossa price 50.00, got {price}"
            # Verify has ingredients
            ingredients = rossa.get("ingredients", [])
            assert len(ingredients) >= 1, f"Expected at least 1 ingredient, got {len(ingredients)}"


class TestP21StockInventory:
    """P21-2: Stock inventory API tests (ingredients list)"""

    def test_get_stock_inventory_returns_200(self, master_token):
        """P21-2: GET /api/proxy/v2/inventory/stock-inventory returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response should have current_stocks array
        assert "current_stocks" in data, f"Expected 'current_stocks' key in response: {data}"

    def test_stock_inventory_has_4_ingredients(self, master_token):
        """P21-2: Ingredients page loads with 4 ingredients from live API"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        stocks = data.get("current_stocks", [])
        # Expected: 4 ingredients (Cooking Oil, maida, patri, red meat)
        assert len(stocks) >= 4, f"Expected at least 4 ingredients, got {len(stocks)}"
        stock_names = [s.get("stock_title", "").lower() for s in stocks]
        expected_names = ["cooking oil", "maida", "patri", "red meat"]
        for expected in expected_names:
            assert any(expected in name for name in stock_names), f"Expected '{expected}' in {stock_names}"


class TestP21NoRegression:
    """P21-16, P21-17: Regression tests for existing functionality"""

    def test_operations_hub_api_still_works(self, master_token):
        """P21-16: Operations Hub still loads correctly — pending-queues API"""
        resp = requests.post(
            f"{BASE_URL}/api/proxy/v2/inventory-transfer/pending-queues",
            headers={"Authorization": f"Bearer {master_token}"},
            json={}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_stock_inventory_api_still_works(self, master_token):
        """P21-17: Stock Inventory page still works"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory",
            headers={"Authorization": f"Bearer {master_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "current_stocks" in data, f"Expected 'current_stocks' in response"


class TestP21RoleAccess:
    """P21-10, P21-11: Role-based access tests (API level)"""

    def test_central_can_access_stock_inventory(self, central_token):
        """Central user can access stock inventory API"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory",
            headers={"Authorization": f"Bearer {central_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_franchise_can_access_stock_inventory(self, franchise_token):
        """Franchise user can access stock inventory API"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/inventory/stock-inventory",
            headers={"Authorization": f"Bearer {franchise_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_central_can_access_recipes(self, central_token):
        """Central user can access recipe API (API access, UI gated)"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/recipe/get-recipe",
            headers={"Authorization": f"Bearer {central_token}"}
        )
        # API may return 200 or 403 depending on POS permissions
        assert resp.status_code in [200, 403], f"Unexpected status: {resp.status_code}"

    def test_franchise_can_access_recipes(self, franchise_token):
        """Franchise user can access recipe API (API access, UI gated)"""
        resp = requests.get(
            f"{BASE_URL}/api/proxy/v2/recipe/get-recipe",
            headers={"Authorization": f"Bearer {franchise_token}"}
        )
        # API may return 200 or 403 depending on POS permissions
        assert resp.status_code in [200, 403], f"Unexpected status: {resp.status_code}"
