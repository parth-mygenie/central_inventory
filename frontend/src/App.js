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
        <Route path="/hierarchy" element={<HierarchySummary />} />
        <Route path="/store/:id" element={<StoreDetail />} />
        <Route path="/queues" element={<PendingQueues />} />
        <Route path="/history" element={<HistoryLedger />} />
        <Route path="/dispatch/new" element={<DirectDispatchForm />} />
        <Route path="/request/new" element={<RequestStockForm />} />
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
