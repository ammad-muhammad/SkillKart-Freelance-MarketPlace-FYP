import { Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from '../Components/common/ErrorBoundary/ErrorBoundary';

// ─── Admin Panel ─────────────────────────────────────────────────────────────
// Deliberately the ONLY things this file imports — no client/freelancer/public
// code, so this chunk (loaded only when isAdminApp()) never pulls in any
// marketplace UI. See AppRoutes.jsx for the client/freelancer/public app.
import { AdminAuthProvider } from '../context/AdminAuthContext';
import AdminProtectedRoute from '../hooks/AdminProtectedRoute';
import AdminPanelLayout from '../layouts/AdminPanelLayout';
import AdminLogin from '../pages/adminPanel/AdminLogin';
import AdminDashboard from '../pages/adminPanel/AdminDashboard';
import UsersPage from '../pages/adminPanel/UsersPage';
import {
  JobsPage, ContractsPage, DisputesPage,
  PaymentsPage, WalletsPage, WithdrawalsPage, TransactionsPage,
  ChatPage as AdminChatPage,
  ReviewsPage as AdminReviewsPage,
  NotificationsPage as AdminNotificationsPage,
  ReportsPage, MonitoringPage, AuditLogsPage, AnalyticsPage, SettingsPage
} from '../pages/adminPanel/AdminPages';
import {
  UserDetailPage, JobDetailPage, ContractDetailPage,
  DisputeDetailPage, ReportDetailPage, ChatDetailPage, PaymentDetailPage
} from '../pages/adminPanel/AdminDetailPages';

const AdminAppRoutes = () => {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        <Routes>
          {/* Root and any stray/unmatched path both land on the login screen —
              AdminLogin itself redirects straight to the dashboard if a
              session is already restored. */}
          <Route path="/" element={<Navigate to="/admin-panel/login" replace />} />
          <Route path="/admin-panel/login" element={<AdminLogin />} />

          <Route
            path="/admin-panel"
            element={
              <AdminProtectedRoute>
                <AdminPanelLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin-panel/dashboard" replace />} />
            <Route path="dashboard"    element={<AdminDashboard />} />
            <Route path="users"        element={<UsersPage />} />
            <Route path="users/:id"    element={<UserDetailPage />} />
            <Route path="jobs"         element={<JobsPage />} />
            <Route path="jobs/:id"     element={<JobDetailPage />} />
            <Route path="contracts"    element={<ContractsPage />} />
            <Route path="contracts/:id" element={<ContractDetailPage />} />
            <Route path="disputes"     element={<DisputesPage />} />
            <Route path="disputes/:contractId" element={<DisputeDetailPage />} />
            <Route path="payments"     element={<PaymentsPage />} />
            <Route path="payments/:id" element={<PaymentDetailPage />} />
            <Route path="wallets"      element={<WalletsPage />} />
            <Route path="withdrawals"  element={<WithdrawalsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="chat"         element={<AdminChatPage />} />
            <Route path="chat/:conversationId" element={<ChatDetailPage />} />
            <Route path="reviews"      element={<AdminReviewsPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="reports"      element={<ReportsPage />} />
            <Route path="reports/:id"  element={<ReportDetailPage />} />
            <Route path="monitoring"   element={<MonitoringPage />} />
            <Route path="audit-logs"   element={<AuditLogsPage />} />
            <Route path="analytics"    element={<AnalyticsPage />} />
            <Route path="settings"     element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin-panel/login" replace />} />
        </Routes>
      </AdminAuthProvider>
    </ErrorBoundary>
  );
};

export default AdminAppRoutes;
