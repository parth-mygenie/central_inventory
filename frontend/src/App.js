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
import DailyConsumptionReport from "@/components/central-inventory/DailyConsumptionReport";
import ProductionRunForm from "@/components/central-inventory/ProductionRunForm";
import ProductionHistory from "@/components/central-inventory/ProductionHistory";
import SubRecipeMaster from "@/components/central-inventory/SubRecipeMaster";
import StoreManagement from "@/components/central-inventory/StoreManagement";
import PurchaseOrderList from "@/components/central-inventory/PurchaseOrderList";
import PurchaseOrderCreate from "@/components/central-inventory/PurchaseOrderCreate";
import PurchaseOrderDetail from "@/components/central-inventory/PurchaseOrderDetail";
import { PermissionDenied } from "@/components/common/StateDisplays";

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
        {/* Dashboard */}
        <Route path="/" element={<OperationsHub />} />

        {/* Inward */}
        <Route path="/vendor-management" element={<VendorManagement />} />
        <Route path="/raw-materials" element={<IngredientCatalogue />} />
        <Route path="/purchase" element={<AddStockPurchaseForm />} />
        <Route path="/purchase/orders" element={<PurchaseOrderList />} />
        <Route path="/purchase/orders/new" element={<PurchaseOrderCreate />} />
        <Route path="/purchase/orders/:id" element={<PurchaseOrderDetail />} />

        {/* Production */}
        <Route path="/sub-recipe-master" element={<SubRecipeMaster />} />
        <Route path="/production/new" element={<ProductionRunForm />} />
        <Route path="/production/history" element={<ProductionHistory />} />
        <Route path="/production/:id" element={<ProductionHistory />} />

        {/* Outward */}
        <Route path="/store-management" element={<StoreManagement />} />
        <Route path="/product-catalog" element={<ProductCatalogue />} />
        <Route path="/inventory" element={<StockInventorySummary />} />
        <Route path="/inventory/:id" element={<StockDetailPanel />} />
        <Route path="/store/:id" element={<StoreDetail />} />
        <Route path="/queues" element={<PendingQueues />} />
        <Route path="/history" element={<HistoryLedger />} />
        <Route path="/dispatch/new" element={<DirectDispatchForm />} />
        <Route path="/request/new" element={<RequestStockForm />} />
        <Route path="/adjustment/new" element={<StockAdjustmentForm />} />
        <Route path="/wastage/new" element={<WastageEntryForm />} />
        <Route path="/transfer/:id" element={<TransferDetail />} />

        {/* Reports */}
        <Route path="/reports/consumption" element={<DailyConsumptionReport />} />
        <Route path="/wastage/report" element={<WastageReport />} />

        {/* Settings */}
        <Route path="/settings" element={<OperationalSettings />} />

        {/* CR-027: Redirects (old routes → new routes) */}
        <Route path="/vendors" element={<Navigate to="/vendor-management" replace />} />
        <Route path="/catalogue/ingredients" element={<Navigate to="/raw-materials" replace />} />
        <Route path="/catalogue/products" element={<Navigate to="/product-catalog" replace />} />
        <Route path="/catalogue/recipes" element={<Navigate to="/product-catalog" replace />} />
        <Route path="/catalogue/addon-recipes" element={<Navigate to="/product-catalog" replace />} />
        <Route path="/procurement/new" element={<Navigate to="/purchase" replace />} />
        <Route path="/hierarchy" element={<Navigate to="/store-management" replace />} />
        <Route path="/hierarchy/manage" element={<Navigate to="/store-management" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

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
