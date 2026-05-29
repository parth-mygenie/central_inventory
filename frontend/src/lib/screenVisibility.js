/**
 * Central Inventory — Screen Visibility Matrix
 *
 * Derived from: CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md
 *
 * Defines which screens and actions are visible per login context.
 * Uses backend restaurant_type_flag values (master / central / franchise).
 */

// ── Screen access levels ─────────────────────────────────────────

const FULL = "full";
const READ = "read";
const LIMITED = "limited";
const HIDDEN = "hidden";

export const SCREEN_VISIBILITY = {
  // Screen ID : { backendType: accessLevel }
  "scr-00-context":        { master: FULL,    central: FULL,    franchise: READ  },
  "scr-01-operations-hub": { master: FULL,    central: FULL,    franchise: LIMITED },
  "scr-02-hierarchy":      { master: FULL,    central: FULL,    franchise: LIMITED },
  "scr-03-store-detail":   { master: FULL,    central: FULL,    franchise: READ  },
  "scr-04-request-stock":  { master: HIDDEN,  central: FULL,    franchise: FULL  },
  "scr-05-pending-queues": { master: FULL,    central: FULL,    franchise: LIMITED },
  "scr-06-approve":        { master: FULL,    central: FULL,    franchise: HIDDEN },
  "scr-07-dispatch":       { master: FULL,    central: FULL,    franchise: HIDDEN },
  "scr-09-transfer-detail":{ master: FULL,    central: FULL,    franchise: READ  },
  "scr-10-receive":        { master: FULL,    central: FULL,    franchise: FULL  },
  "scr-17-adjustment":     { master: FULL,    central: HIDDEN,  franchise: HIDDEN },
  "scr-18-wastage":        { master: FULL,    central: FULL,    franchise: FULL  },
  "scr-20-reports":        { master: FULL,    central: FULL,    franchise: FULL  },
  "scr-consumption-report":{ master: FULL,    central: FULL,    franchise: FULL  },
  "scr-history-ledger":    { master: FULL,    central: FULL,    franchise: FULL  },
  "scr-settings":          { master: FULL,    central: HIDDEN,  franchise: HIDDEN },
  "scr-vendors":           { master: FULL,    central: FULL,    franchise: HIDDEN },
  "scr-procurement":       { master: FULL,    central: FULL,    franchise: HIDDEN },
  "scr-stock-inventory":   { master: FULL,    central: FULL,    franchise: FULL  },
  "scr-catalogue":         { master: FULL,    central: HIDDEN,  franchise: HIDDEN },
  "scr-hierarchy-manage":  { master: FULL,    central: FULL,    franchise: HIDDEN },
  "scr-21-api-verify":     { master: HIDDEN,  central: HIDDEN,  franchise: HIDDEN }, // admin only
};

// ── Action permission matrix ─────────────────────────────────────

export const ACTION_PERMISSIONS = {
  "dispatch":         { master: true,  central: true,  franchise: false },
  "approve":          { master: true,  central: true,  franchise: false },
  "reject":           { master: true,  central: true,  franchise: false },
  "request-stock":    { master: false, central: true,  franchise: true  },
  "receive":          { master: true,  central: true,  franchise: true  },
  "cancel":           { master: true,  central: true,  franchise: false },
  "report-issue":     { master: true,  central: true,  franchise: true  },
  "adjust-stock":     { master: true,  central: false, franchise: false },
  "record-wastage":   { master: true,  central: true,  franchise: true  },
  "create-items":     { master: true,  central: false, franchise: false },
  "view-cross-reports": { master: true, central: false, franchise: false },
  "manage-vendors":    { master: true, central: true,  franchise: false },
  "add-stock-purchase":{ master: true, central: true,  franchise: false },
};

// ── Navigation items (for sidebar) ───────────────────────────────

export const NAV_ITEMS = [
  {
    id: "operations-hub",
    screen: "scr-01-operations-hub",
    label: "Operations Hub",
    path: "/",
    icon: "LayoutDashboard",
  },
  {
    id: "stock-inventory",
    screen: "scr-stock-inventory",
    label: "Stock Inventory",
    path: "/inventory",
    icon: "Package",
  },
  {
    id: "hierarchy",
    screen: "scr-02-hierarchy",
    label: "Hierarchy Summary",
    path: "/hierarchy",
    icon: "Network",
  },
  {
    id: "hierarchy-manage",
    screen: "scr-hierarchy-manage",
    label: "Store Management",
    path: "/hierarchy/manage",
    icon: "GitBranch",
  },
  {
    id: "pending-queues",
    screen: "scr-05-pending-queues",
    label: "Pending Queues",
    path: "/queues",
    icon: "Inbox",
  },
  {
    id: "history-ledger",
    screen: "scr-history-ledger",
    label: "History & Ledger",
    path: "/history",
    icon: "ScrollText",
  },
  {
    id: "consumption-report",
    screen: "scr-consumption-report",
    label: "Consumption Report",
    path: "/reports/consumption",
    icon: "BarChart3",
  },
  {
    id: "vendors",
    screen: "scr-vendors",
    label: "Vendors",
    path: "/vendors",
    icon: "Building2",
  },
  {
    id: "catalogue-ingredients",
    screen: "scr-catalogue",
    label: "Ingredients",
    path: "/catalogue/ingredients",
    icon: "Beaker",
  },
  {
    id: "catalogue-products",
    screen: "scr-catalogue",
    label: "Products",
    path: "/catalogue/products",
    icon: "UtensilsCrossed",
  },
  {
    id: "catalogue-recipes",
    screen: "scr-catalogue",
    label: "Recipes",
    path: "/catalogue/recipes",
    icon: "BookOpen",
  },
  {
    id: "catalogue-addon-recipes",
    screen: "scr-catalogue",
    label: "Addon Recipes",
    path: "/catalogue/addon-recipes",
    icon: "Link2",
  },
  {
    id: "settings",
    screen: "scr-settings",
    label: "Settings",
    path: "/settings",
    icon: "Settings",
  },
];

// ── Utility functions ────────────────────────────────────────────

export function getScreenAccess(screenId, restaurantType) {
  const type = (restaurantType || "").toLowerCase().trim();
  const screen = SCREEN_VISIBILITY[screenId];
  if (!screen) return HIDDEN;
  return screen[type] || HIDDEN;
}

export function canAccessScreen(screenId, restaurantType) {
  const access = getScreenAccess(screenId, restaurantType);
  return access !== HIDDEN;
}

export function isScreenReadOnly(screenId, restaurantType) {
  const access = getScreenAccess(screenId, restaurantType);
  return access === READ;
}

export function canPerformAction(actionId, restaurantType) {
  const type = (restaurantType || "").toLowerCase().trim();
  const perm = ACTION_PERMISSIONS[actionId];
  if (!perm) return false;
  return perm[type] || false;
}

export function getVisibleNavItems(restaurantType) {
  return NAV_ITEMS.filter((item) => canAccessScreen(item.screen, restaurantType));
}

export { FULL, READ, LIMITED, HIDDEN };
