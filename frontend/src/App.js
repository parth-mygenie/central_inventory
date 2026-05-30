import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginContextProvider, useLoginContext } from "@/hooks/useLoginContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/components/layout/LoginPage";
import OperationsHub from "@/components/central-inventory/OperationsHub";
import HierarchySummary from "@/components/central-inventory/HierarchySummary";
import StoreDetail from "@/components/central-inventory/StoreDetail";
import PendingQueues from "@/components/central-inventory/PendingQueues";
import TransferDetail from "@/components/central-inventory/TransferDetail";
import HistoryLedger from "@/components/central-inventory/HistoryLedger";
import DirectDispatchForm from "@/components/central-inventory/DirectDispatchForm";
import RequestStockForm from "@/components/central-inventory/RequestStockForm";
import StockAdjustmentForm from "@/components/central-inventory/StockAdjustmentForm";
import WastageEntryForm from "@/components/central-inventory/WastageEntryForm";
import WastageReport from "@/components/central-inventory/WastageReport";
import OperationalSettings from "@/components/central-inventory/OperationalSettings";
import VendorManagement from "@/components/central-inventory/VendorManagement";
import AddStockPurchaseForm from "@/components/central-inventory/AddStockPurchaseForm";
import StockInventorySummary from "@/components/central-inventory/StockInventorySummary";
import StockDetailPanel from "@/components/central-inventory/StockDetailPanel";
import IngredientCatalogue from "@/components/central-inventory/IngredientCatalogue";
import ProductCatalogue from "@/components/central-inventory/ProductCatalogue";
import RecipeCatalogue from "@/components/central-inventory/RecipeCatalogue";
import AddonRecipeCatalogue from "@/components/central-inventory/AddonRecipeCatalogue";
import DailyConsumptionReport from "@/components/central-inventory/DailyConsumptionReport";
import HierarchyManagement from "@/components/central-inventory/HierarchyManagement";
import { PermissionDenied } from "@/components/common/StateDisplays";

/**
 * Route structure per CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md
 *
 * /              → SCR-01 Operations Hub
 * /hierarchy     → SCR-02 Hierarchy Summary
 * /store/:id     → SCR-03 Store Detail
 * /queues        → SCR-05 Pending Queues
 * /transfer/:id  → SCR-09 Transfer Detail
 */

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useLoginContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AuthRoute({ children }) {
  const { isAuthenticated } = useLoginContext();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login — NOT redesigned, minimal login for auth token */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        }
      />

      {/* Protected app shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<OperationsHub />} />
        <Route path="/inventory" element={<StockInventorySummary />} />
        <Route path="/inventory/:id" element={<StockDetailPanel />} />
        <Route path="/hierarchy" element={<HierarchySummary />} />
        <Route path="/store/:id" element={<StoreDetail />} />
        <Route path="/queues" element={<PendingQueues />} />
        <Route path="/history" element={<HistoryLedger />} />
        <Route path="/dispatch/new" element={<DirectDispatchForm />} />
        <Route path="/request/new" element={<RequestStockForm />} />
        <Route path="/adjustment/new" element={<StockAdjustmentForm />} />
        <Route path="/wastage/new" element={<WastageEntryForm />} />
        <Route path="/wastage/report" element={<WastageReport />} />
        <Route path="/settings" element={<OperationalSettings />} />
        <Route path="/vendors" element={<VendorManagement />} />
        <Route path="/procurement/new" element={<AddStockPurchaseForm />} />
        <Route path="/catalogue/ingredients" element={<IngredientCatalogue />} />
        <Route path="/catalogue/products" element={<ProductCatalogue />} />
        <Route path="/catalogue/recipes" element={<RecipeCatalogue />} />
        <Route path="/catalogue/addon-recipes" element={<AddonRecipeCatalogue />} />
        <Route path="/reports/consumption" element={<DailyConsumptionReport />} />
        <Route path="/hierarchy/manage" element={<HierarchyManagement />} />
        <Route path="/transfer/:id" element={<TransferDetail />} />

        {/* Catch-all → redirect to hub */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Catch-all for unauthenticated */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LoginContextProvider>
        <AppRoutes />
      </LoginContextProvider>
    </BrowserRouter>
  );
}

export default App;
