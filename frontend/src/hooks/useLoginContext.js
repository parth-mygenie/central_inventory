import { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  canAccessScreen,
  isScreenReadOnly,
  canPerformAction,
  getVisibleNavItems,
} from "@/lib/screenVisibility";
import { mapRestaurantType, mapRole, HIERARCHY_LEVEL } from "@/lib/terminology";
import api from "@/services/api";

const LoginContext = createContext(null);

/**
 * Central Inventory — Login Context Provider
 *
 * Derives user hierarchy level from `restaurant_type_flag`.
 *
 * SECURITY NOTE: Token stored in localStorage for persistence across tabs.
 * localStorage is vulnerable to XSS — ensure CSP headers and input sanitization.
 * Migration to httpOnly cookies requires backend proxy changes (tracked as future item).
 *
 * Provides:
 *   - auth state (token, user profile)
 *   - user level / store scope
 *   - screen visibility helpers
 *   - action permission helpers
 *   - login / logout
 */
export function LoginContextProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ci_token") || null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ci_user")); } catch (e) { console.warn("[auth] Failed to parse stored user:", e); return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derived values
  // restaurant_type_flag is required for correct role/permission derivation.
  // If missing, restaurantType stays null — privileged actions are blocked.
  // The restaurantTypeUnknown flag surfaces a diagnostic warning in the header.
  const rawRestaurantType = user?.restaurant_type_flag || null;
  const restaurantType = rawRestaurantType || null;
  const restaurantTypeUnknown = !rawRestaurantType && !!user;
  const restaurantId = user?.restaurant_id || null;
  const hierarchyLevel = restaurantType ? HIERARCHY_LEVEL[restaurantType] : null;
  const userLevelLabel = mapRestaurantType(restaurantType);
  const userRoleLabel = mapRole(restaurantType);
  const isTopLevel = hierarchyLevel === 0;
  const isMiddleLevel = hierarchyLevel === 1;
  const isBottomLevel = hierarchyLevel === 2;
  const isAuthenticated = !!token && !!user;

  // Persist token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem("ci_token", token);
      api.setToken(token);
    } else {
      localStorage.removeItem("ci_token");
      api.setToken(null);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("ci_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ci_user");
    }
  }, [user]);

  // Restore token on mount
  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.login(email, password);
      const data = resp.data;

      // Extract token — API may return in different shapes
      const bearerToken =
        data?.token ||
        data?.data?.token ||
        data?.access_token ||
        data?.data?.access_token;

      // Extract user profile from response
      const profile = data?.data?.user || data?.user || data?.data || {};
      const typeFlag =
        profile.restaurant_type_flag ||
        data?.restaurant_type_flag ||
        data?.data?.restaurant_type_flag;

      const restId =
        profile.restaurant_id ||
        data?.restaurant_id ||
        data?.data?.restaurant_id;

      if (!bearerToken) {
        throw new Error("Login succeeded but no token received");
      }

      const userObj = {
        ...profile,
        restaurant_type_flag: typeFlag,
        restaurant_id: restId,
        restaurant_name: profile.restaurant_name || data?.restaurant_name || data?.data?.restaurant_name,
        parent_restaurant_id: profile.parent_restaurant_id || data?.parent_restaurant_id || data?.data?.parent_restaurant_id || null,
      };

      setToken(bearerToken);
      setUser(userObj);
      return { success: true, user: userObj };
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Login failed";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem("ci_token");
    localStorage.removeItem("ci_user");
    api.setToken(null);
  }, []);

  // Screen / action helpers bound to current user type
  const canAccess = useCallback(
    (screenId) => canAccessScreen(screenId, restaurantType),
    [restaurantType]
  );

  const isReadOnly = useCallback(
    (screenId) => isScreenReadOnly(screenId, restaurantType),
    [restaurantType]
  );

  const canDo = useCallback(
    (actionId) => canPerformAction(actionId, restaurantType),
    [restaurantType]
  );

  const visibleNav = getVisibleNavItems(restaurantType);

  const value = {
    // Auth
    token,
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,

    // User context
    restaurantType,
    restaurantTypeUnknown,
    restaurantId,
    hierarchyLevel,
    userLevelLabel,
    userRoleLabel,
    isTopLevel,
    isMiddleLevel,
    isBottomLevel,

    // Permissions
    canAccess,
    isReadOnly,
    canDo,
    visibleNav,
  };

  return <LoginContext.Provider value={value}>{children}</LoginContext.Provider>;
}

export function useLoginContext() {
  const ctx = useContext(LoginContext);
  if (!ctx) {
    throw new Error("useLoginContext must be used within LoginContextProvider");
  }
  return ctx;
}

export default LoginContext;
