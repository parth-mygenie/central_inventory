/**
 * Central Inventory — Screen Visibility Matrix
 *
 * Derived from: CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md
 * CR-027: Restructured with NAV_SECTIONS (grouped sidebar)
 *
 * Uses backend restaurant_type_flag values (master / central / franchise).
 */

// ── Screen access levels ─────────────────────────────────────────

const FULL = "full";
const READ = "read";
const LIMITED = "limited";
const HIDDEN = "hidden";

export const SCREEN_VISIBILITY = {
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
  "scr-21-api-verify":     { master: HIDDEN,  central: HIDDEN,  franchise: HIDDEN },
  "scr-production":        { master: FULL,    central: FULL,    franchise: HIDDEN },
  // CR-027: New screen IDs for restructured navigation
  "scr-raw-material-master": { master: FULL,  central: HIDDEN,  franchise: HIDDEN },
  "scr-product-catalog":     { master: FULL,  central: HIDDEN,  franchise: HIDDEN },
  "scr-sub-recipe-master":   { master: FULL,  central: HIDDEN,  franchise: HIDDEN },
  "scr-purchase":            { master: FULL,  central: FULL,    franchise: HIDDEN },
  "scr-vendor-management":   { master: FULL,  central: FULL,    franchise: HIDDEN },
  "scr-store-management":    { master: FULL,  central: FULL,    franchise: HIDDEN },
  "scr-wastage-report":      { master: FULL,  central: FULL,    franchise: FULL  },
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
  "run-production":    { master: true, central: true,  franchise: false },
};

// ── CR-027: Section-aware navigation (grouped sidebar) ───────────

export const NAV_SECTIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      { id: "operations-hub", screen: "scr-01-operations-hub", label: "Operations Hub", path: "/", icon: "LayoutDashboard" },
    ],
  },
  {
    id: "inward",
    label: "Inward",
    items: [
      { id: "vendor-management", screen: "scr-vendor-management", label: "Vendor Management", path: "/vendor-management", icon: "Building2" },
      { id: "raw-material-master", screen: "scr-raw-material-master", label: "Raw Material Master", path: "/raw-materials", icon: "Beaker" },
      { id: "purchase", screen: "scr-purchase", label: "Purchase", path: "/purchase", icon: "ShoppingCart" },
      { id: "rm-stock", screen: "scr-stock-inventory", label: "RM Stock", path: "/inventory?type=raw", icon: "Package" },
    ],
  },
  {
    id: "production",
    label: "Production",
    items: [
      { id: "sub-recipe-master", screen: "scr-sub-recipe-master", label: "Sub-Recipe Master", path: "/sub-recipe-master", icon: "BookOpen" },
      { id: "run-production", screen: "scr-production", label: "Run Production", path: "/production/new", icon: "Factory" },
      { id: "production-history", screen: "scr-production", label: "Production History", path: "/production/history", icon: "ClipboardList" },
    ],
  },
  {
    id: "outward",
    label: "Outward",
    items: [
      { id: "store-management", screen: "scr-store-management", label: "Store Management", path: "/store-management", icon: "GitBranch" },
      { id: "product-catalog", screen: "scr-product-catalog", label: "Product Catalog", path: "/product-catalog", icon: "UtensilsCrossed" },
      { id: "stock-inventory", screen: "scr-stock-inventory", label: "FG Stock", path: "/inventory?type=fg", icon: "Package" },
      { id: "pending-queues", screen: "scr-05-pending-queues", label: "Pending Queues", path: "/queues", icon: "Inbox" },
      { id: "history-ledger", screen: "scr-history-ledger", label: "History & Ledger", path: "/history", icon: "ScrollText" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    items: [
      { id: "consumption-report", screen: "scr-consumption-report", label: "Consumption Report", path: "/reports/consumption", icon: "BarChart3" },
      { id: "wastage-report", screen: "scr-wastage-report", label: "Wastage Report", path: "/wastage/report", icon: "TrendingDown" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { id: "settings", screen: "scr-settings", label: "Settings", path: "/settings", icon: "Settings" },
    ],
  },
];

// ── Flat NAV_ITEMS (backwards compat for any code using old export) ──
export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

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

export function getVisibleNavSections(restaurantType) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessScreen(item.screen, restaurantType)),
  })).filter((section) => section.items.length > 0);
}

export { FULL, READ, LIMITED, HIDDEN };
