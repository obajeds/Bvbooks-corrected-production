import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Suspense, lazy } from "react";
import { BranchProvider } from "./contexts/BranchContext";
import { AuthProvider } from "./contexts/AuthContext";
import { OfflineProvider } from "./hooks/useOfflineState";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SessionTimeoutProvider } from "./components/auth/SessionTimeoutProvider";
import { PermissionProtectedRoute } from "./components/auth/PermissionProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { MobileLayout } from "./components/layout/MobileLayout";
import { ExperienceRouter } from "./components/routing/ExperienceRouter";

// Lazy-loaded page imports for code splitting
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const BusinessSetup = lazy(() => import("./pages/BusinessSetup"));
const Subscription = lazy(() => import("./pages/Subscription"));
const POS = lazy(() => import("./pages/POS"));
const Sales = lazy(() => import("./pages/Sales"));
const CRM = lazy(() => import("./pages/CRM"));
const CustomerOverview = lazy(() => import("./pages/customers/CustomerOverview"));
const CustomerActivity = lazy(() => import("./pages/customers/CustomerActivity"));
const CustomerGroups = lazy(() => import("./pages/customers/CustomerGroups"));
const CustomerLoyalty = lazy(() => import("./pages/customers/CustomerLoyalty"));
const Staff = lazy(() => import("./pages/Staff"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Settlements = lazy(() => import("./pages/accounting/Settlements"));
const Reconciliations = lazy(() => import("./pages/accounting/Reconciliations"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Activity = lazy(() => import("./pages/Activity"));
const Settings = lazy(() => import("./pages/Settings"));
const Items = lazy(() => import("./pages/inventory/Items"));
const Categories = lazy(() => import("./pages/inventory/Categories"));
const Stock = lazy(() => import("./pages/inventory/Stock"));
const StockAdjustments = lazy(() => import("./pages/inventory/StockAdjustments"));
const Suppliers = lazy(() => import("./pages/inventory/Suppliers"));
const PurchaseOrders = lazy(() => import("./pages/inventory/PurchaseOrders"));
const StockReconciliation = lazy(() => import("./pages/inventory/StockReconciliation"));

const Attendance = lazy(() => import("./pages/hrm/Attendance"));
const Departments = lazy(() => import("./pages/hrm/Departments"));
const Payroll = lazy(() => import("./pages/hrm/Payroll"));
const Leave = lazy(() => import("./pages/hrm/Leave"));
const CashierSalesEntry = lazy(() => import("./pages/gas/CashierSalesEntry"));
const DailyBusinessSummary = lazy(() => import("./pages/gas/DailyBusinessSummary"));
const PumpManagement = lazy(() => import("./pages/gas/PumpManagement"));
const UserManagement = lazy(() => import("./pages/settings/UserManagement"));
const Approvals = lazy(() => import("./pages/Approvals"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const HelpCenter = lazy(() => import("./pages/help/HelpCenter"));
const HelpArticle = lazy(() => import("./pages/help/HelpArticle"));
const MobileDashboard = lazy(() => import("./pages/mobile/MobileDashboard"));
const PriceChecker = lazy(() => import("./pages/PriceChecker"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Create QueryClient outside component to avoid HMR issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes cache retention
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineProvider>
        <SessionTimeoutProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Auth entry point - BusinessSetup handles both auth and setup */}
              <Route path="/" element={<BusinessSetup />} />
              <Route path="/auth" element={<BusinessSetup />} />
              <Route path="/login" element={<BusinessSetup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/price-check/:businessId" element={<PriceChecker />} />
              
              {/* Business setup - protected but no branch context needed */}
              <Route
                path="/setup"
                element={
                  <ProtectedRoute>
                    <BusinessSetup />
                  </ProtectedRoute>
                }
              />
              
              {/* Subscription page - protected */}
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <BranchProvider>
                      <Subscription />
                    </BranchProvider>
                  </ProtectedRoute>
                }
              />
              
              {/* Experience router - redirects to mobile or web based on role/device */}
              <Route
                path="/experience"
                element={
                  <ProtectedRoute>
                    <BranchProvider>
                      <ExperienceRouter />
                    </BranchProvider>
                  </ProtectedRoute>
                }
              />
              
              {/* Mobile experience routes - BranchProvider wraps all mobile routes */}
              <Route
                path="/mobile/*"
                element={
                  <ProtectedRoute>
                    <BranchProvider>
                    <MobileLayout>
                      <Routes>
                        <Route path="/" element={<MobileDashboard />} />
                        
                        {/* Sales */}
                        <Route 
                          path="/pos" 
                          element={
                            <PermissionProtectedRoute permissions="pos.access">
                              <POS />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/sales" 
                          element={
                            <PermissionProtectedRoute permissions={["pos.access", "sales.view"]}>
                              <Sales />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Stock Control - all inventory routes */}
                        <Route 
                          path="/inventory" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Stock />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/items" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Items />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/categories" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Categories />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/stock" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Stock />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/adjustments" 
                          element={
                            <PermissionProtectedRoute permissions={["inventory.adjust.create", "inventory.adjust.approve"]}>
                              <StockAdjustments />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/suppliers" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Suppliers />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/purchase-orders" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <PurchaseOrders />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/reconciliation" 
                          element={
                            <PermissionProtectedRoute permissions={["inventory.adjust.create", "inventory.adjust.approve"]}>
                              <StockReconciliation />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Customers */}
                        <Route 
                          path="/customers" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerOverview />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/customers/activity" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerActivity />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/customers/groups" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerGroups />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/customers/loyalty" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerLoyalty />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/crm" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerOverview />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Operations */}
                        <Route 
                          path="/expenses" 
                          element={
                            <PermissionProtectedRoute permissions="expenses.view">
                              <Expenses />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/approvals" 
                          element={
                            <PermissionProtectedRoute permissions={["approval.refund", "approval.stock_adjustment", "approval.discount"]}>
                              <Approvals />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Business Insights */}
                        <Route 
                          path="/reports" 
                          element={
                            <PermissionProtectedRoute permissions="reports.view.summary">
                              <Reports />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/accounting" 
                          element={
                            <PermissionProtectedRoute permissions="accounting.overview.view">
                              <Accounting />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/accounting/settlements" 
                          element={
                            <PermissionProtectedRoute permissions="accounting.settlements.view">
                              <Settlements />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/accounting/reconciliations" 
                          element={
                            <PermissionProtectedRoute permissions="accounting.reconciliations.view">
                              <Reconciliations />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* People & Access */}
                        <Route 
                          path="/staff" 
                          element={
                            <PermissionProtectedRoute permissions="staff.view">
                              <Staff />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/departments" 
                          element={
                            <PermissionProtectedRoute permissions="staff.manage">
                              <Departments />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/attendance" 
                          element={
                            <PermissionProtectedRoute permissions="staff.manage">
                              <Attendance />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/payroll" 
                          element={
                            <PermissionProtectedRoute permissions="staff.manage">
                              <Payroll />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/leave" 
                          element={
                            <PermissionProtectedRoute permissions="staff.manage">
                              <Leave />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Settings - has internal permission check */}
                        <Route path="/settings" element={<Settings />} />
                        <Route 
                          path="/activity" 
                          element={
                            <PermissionProtectedRoute permissions="audit.view">
                              <Activity />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route path="/help" element={<HelpCenter />} />
                        <Route path="/help/:slug" element={<HelpArticle />} />
                        
                        {/* Notifications */}
                        <Route path="/notifications" element={<Notifications />} />
                        
                        {/* Gas Module */}
                        <Route 
                          path="/gas/sales-entry" 
                          element={
                            <PermissionProtectedRoute permissions="gas.sales.entry">
                              <CashierSalesEntry />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/gas/pumps" 
                          element={
                            <PermissionProtectedRoute permissions="gas.pumps.manage">
                              <PumpManagement />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/gas/summary" 
                          element={
                            <PermissionProtectedRoute permissions="gas.summary.view">
                              <DailyBusinessSummary />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/gas" 
                          element={
                            <PermissionProtectedRoute permissions="gas.sales.entry">
                              <CashierSalesEntry />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/mobile" replace />} />
                      </Routes>
                    </MobileLayout>
                    </BranchProvider>
                  </ProtectedRoute>
                }
              />
              
              {/* Protected dashboard routes (web experience) - BranchProvider wraps all dashboard routes */}
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <BranchProvider>
                    <DashboardLayout>
                      <Routes>
                        {/* Dashboard home shows Business Health */}
                        <Route path="/" element={<Dashboard />} />
                        
                        {/* POS - requires pos.access */}
                        <Route 
                          path="/pos" 
                          element={
                            <PermissionProtectedRoute permissions="pos.access">
                              <POS />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Sales - requires sales.view */}
                        <Route 
                          path="/sales" 
                          element={
                            <PermissionProtectedRoute permissions={["pos.access", "sales.view"]}>
                              <Sales />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Customers - requires crm.view */}
                        <Route 
                          path="/customers" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerOverview />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/customers/activity" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerActivity />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/customers/groups" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerGroups />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/customers/loyalty" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerLoyalty />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Legacy CRM route - redirect to customers */}
                        <Route 
                          path="/crm" 
                          element={
                            <PermissionProtectedRoute permissions="crm.view">
                              <CustomerOverview />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Staff - requires staff.view */}
                        <Route 
                          path="/staff" 
                          element={
                            <PermissionProtectedRoute permissions="staff.view">
                              <Staff />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Expenses - requires expenses.view */}
                        <Route 
                          path="/expenses" 
                          element={
                            <PermissionProtectedRoute permissions="expenses.view">
                              <Expenses />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Accounting - requires accounting.overview.view */}
                        <Route 
                          path="/accounting" 
                          element={
                            <PermissionProtectedRoute permissions="accounting.overview.view">
                              <Accounting />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/accounting/settlements" 
                          element={
                            <PermissionProtectedRoute permissions="accounting.settlements.view">
                              <Settlements />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/accounting/reconciliations" 
                          element={
                            <PermissionProtectedRoute permissions="accounting.reconciliations.view">
                              <Reconciliations />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Reports - requires reports.view.summary */}
                        <Route 
                          path="/reports" 
                          element={
                            <PermissionProtectedRoute permissions="reports.view.summary">
                              <Reports />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Notifications - accessible to all */}
                        <Route path="/notifications" element={<Notifications />} />
                        
                        {/* Activity Log - requires audit.view */}
                        <Route 
                          path="/activity" 
                          element={
                            <PermissionProtectedRoute permissions="audit.view">
                              <Activity />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Approvals - requires approval permissions */}
                        <Route 
                          path="/approvals" 
                          element={
                            <PermissionProtectedRoute permissions={["approval.refund", "approval.stock_adjustment", "approval.discount"]}>
                              <Approvals />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Settings - has internal permission check */}
                        <Route path="/settings" element={<Settings />} />
                        
                        {/* Help Center - accessible to all */}
                        <Route path="/help" element={<HelpCenter />} />
                        <Route path="/help/:slug" element={<HelpArticle />} />
                        
                        <Route 
                          path="/settings/users" 
                          element={
                            <PermissionProtectedRoute permissions="staff.permissions.manage">
                              <UserManagement />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Inventory routes - requires inventory.view */}
                        <Route 
                          path="/inventory" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Items />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/items" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Items />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/categories" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Categories />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/stock" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Stock />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/adjustments" 
                          element={
                            <PermissionProtectedRoute permissions={["inventory.adjust.create", "inventory.adjust.approve"]}>
                              <StockAdjustments />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/suppliers" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <Suppliers />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/purchase-orders" 
                          element={
                            <PermissionProtectedRoute permissions="inventory.view">
                              <PurchaseOrders />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/reconciliation" 
                          element={
                            <PermissionProtectedRoute permissions={["inventory.adjust.create", "inventory.adjust.approve"]}>
                              <StockReconciliation />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* HRM routes - requires staff.view */}
                        <Route 
                          path="/hrm" 
                          element={
                            <PermissionProtectedRoute permissions="staff.view">
                              <Attendance />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/attendance" 
                          element={
                            <PermissionProtectedRoute permissions="staff.view">
                              <Attendance />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/departments" 
                          element={
                            <PermissionProtectedRoute permissions="staff.view">
                              <Departments />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/payroll" 
                          element={
                            <PermissionProtectedRoute permissions="staff.view">
                              <Payroll />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hrm/leave" 
                          element={
                            <PermissionProtectedRoute permissions="staff.view">
                              <Leave />
                            </PermissionProtectedRoute>
                          } 
                        />
                        
                        {/* Gas Module routes */}
                        <Route 
                          path="/gas/sales-entry" 
                          element={
                            <PermissionProtectedRoute permissions="gas.sales.entry">
                              <CashierSalesEntry />
                            </PermissionProtectedRoute>
                          } 
                        />
                        {/* Alias for gas sales entry */}
                        <Route 
                          path="/gas" 
                          element={
                            <PermissionProtectedRoute permissions="gas.sales.entry">
                              <CashierSalesEntry />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/gas/summary" 
                          element={
                            <PermissionProtectedRoute permissions="gas.summary.view">
                              <DailyBusinessSummary />
                            </PermissionProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/gas/pumps" 
                          element={
                            <PermissionProtectedRoute permissions="gas.pumps.manage">
                              <PumpManagement />
                            </PermissionProtectedRoute>
                          } 
                        />
                        {/* Catch-all for unknown dashboard routes */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </DashboardLayout>
                    </BranchProvider>
                  </ProtectedRoute>
                }
              />
              
              {/* Redirect old routes to dashboard equivalents */}
              <Route path="/pos" element={<Navigate to="/dashboard/pos" replace />} />
              <Route path="/sales" element={<Navigate to="/dashboard/sales" replace />} />
              <Route path="/crm" element={<Navigate to="/dashboard/crm" replace />} />
              <Route path="/staff" element={<Navigate to="/dashboard/staff" replace />} />
              <Route path="/expenses" element={<Navigate to="/dashboard/expenses" replace />} />
              <Route path="/accounting" element={<Navigate to="/dashboard/accounting" replace />} />
              <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
              <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
              <Route path="/activity" element={<Navigate to="/dashboard/activity" replace />} />
              <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
              <Route path="/approvals" element={<Navigate to="/dashboard/approvals" replace />} />
              <Route path="/inventory/*" element={<Navigate to="/dashboard/inventory" replace />} />
              <Route path="/hrm/*" element={<Navigate to="/dashboard/hrm" replace />} />
              
              {/* Global catch-all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster position="top-right" />
        </SessionTimeoutProvider>
        </OfflineProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
