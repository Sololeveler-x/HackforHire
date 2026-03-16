import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import BillingDashboard from "./pages/BillingDashboard";
import PackingDashboard from "./pages/PackingDashboard";
import ShippingDashboard from "./pages/ShippingDashboard";
import OrderTracking from "./pages/OrderTracking";
import NotFound from "./pages/NotFound";
import SalesAgentDashboard from "./pages/SalesAgentDashboard";
import CustomerPortal from "./pages/CustomerPortal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/track/:trackingId" element={<OrderTracking />} />
            <Route path="/customer" element={<CustomerPortal />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/*"
              element={
                <ProtectedRoute allowedRoles={['billing', 'admin']}>
                  <BillingDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/packing/*"
              element={
                <ProtectedRoute allowedRoles={['packing', 'admin']}>
                  <PackingDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shipping/*"
              element={
                <ProtectedRoute allowedRoles={['shipping', 'admin']}>
                  <ShippingDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
            <Route
              path="/sales-agent/*"
              element={
                <ProtectedRoute allowedRoles={['sales_agent', 'admin']}>
                  <SalesAgentDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
