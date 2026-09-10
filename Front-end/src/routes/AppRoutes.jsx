import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import ProtectedRoute from '../hooks/ProtectedRoute';
import { ClientProvider } from '../context/ClientContext';
import { FreelancerProvider } from '../context/FreelancerContext';
import ErrorBoundary from '../Components/common/ErrorBoundary/ErrorBoundary';
import { isMobileApp } from '../utils/platform';

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import AdminLayout from "../layouts/AdminLayout";
import FreelancerLayout from "../layouts/FreelancerLayout";

// Admin Pages (marketplace)
import TaxonomyAdmin from "../pages/admin/TaxonomyAdmin";

// ─── Admin Panel ─────────────────────────────────────────────────────────────
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

// Freelancer Pages
import DashboardOverview from "../pages/freelancer/DashboardOverview";
import FreelancerProfile from "../pages/freelancer/FreelancerProfile";
import FreelancerSettings from "../pages/freelancer/FreelancerSettings";
import FreelancerSecurity from "../pages/freelancer/FreelancerSecurity";
import FreelancerGigs from "../pages/freelancer/FreelancerGigs";
import CreateGig from "../pages/freelancer/CreateGig";
import FreelancerPortfolio from "../pages/freelancer/FreelancerPortfolio";
import FreelancerMessages from "../pages/freelancer/FreelancerMessages";
import FreelancerSavedProjects from "../pages/freelancer/FreelancerSavedProjects";
import FreelancerProposals from "../pages/freelancer/FreelancerProposals";
import SkillTest from "../pages/freelancer/SkillTest";
import FreelancerWork from "../pages/freelancer/FreelancerWork";
import FreelancerWallet from "../pages/freelancer/FreelancerWallet";
import PaymentConfirm from "../pages/public/PaymentConfirm/PaymentConfirm";
import NotificationsPage from "../pages/common/NotificationsPage";

// Client Pages
import ClientLayout from "../layouts/ClientLayout";
import ClientDashboardOverview from "../pages/client/ClientDashboardOverview";
import ClientProfile from "../pages/client/ClientProfile";
import ClientSettings from "../pages/client/ClientSettings";
import ClientSecurity from "../pages/client/ClientSecurity";
import ClientProjects from "../pages/client/ClientProjects";
import ClientPostProject from "../pages/client/PostProject";
import ClientSavedFreelancers from "../pages/client/ClientSavedFreelancers";
import ClientMessages from "../pages/client/ClientMessages";
import ClientWallet from "../pages/client/ClientWallet";

import ReviewProposals from "../pages/client/ReviewProposals";

// Freelancer
import StripeCallback from '../pages/freelancer/StripeCallback';

// Public Pages
import Home from "../pages/public/Home/Home";
import Login from "../pages/public/Login/Login";
import AuthConsent from "../pages/public/AuthConsent/AuthConsent";
import Registration from "../pages/public/Register/Registration";
import Role from "../pages/public/Role/Role";
import OTP from "../pages/public/OTP/OTP";
import ForgotPassword from "../pages/public/ForgotPassword/ForgotPassword";
import About from "../pages/public/About/About";
import Contact from "../pages/public/Contact/Contact";
import PrivacyPolicy from "../pages/public/Legal/PrivacyPolicy";
import TermsOfService from "../pages/public/Legal/TermsOfService";
import CookiePolicy from "../pages/public/Legal/CookiePolicy";
import ServicesAgreement from "../pages/public/Legal/ServicesAgreement";

import BrowseFreelancers from "../pages/public/BrowseFreelancers/BrowseFreelancers";
import PostProject from "../pages/public/PostProject/PostProject";
import AiMatchmaking from "../pages/public/AiMatchmaking/AiMatchmaking";
import HelpCenter from "../pages/public/HelpCenter/HelpCenter";
import Categories from "../pages/public/Categories/Categories";
import BrowseProjects from "../pages/public/BrowseProjects/BrowseProjects";
import JobDetails from "../pages/public/JobDetails/JobDetails";
import GigDetail from "../pages/public/GigDetail/GigDetail";
import PublicFreelancerProfile from "../pages/public/FreelancerProfile/PublicFreelancerProfile";
import PublicClientProfile from "../pages/public/ClientProfile/PublicClientProfile";

import ClientOnboarding from "../pages/public/ClientOnboarding/ClientOnboarding";
import FreelancerOnboarding from "../pages/public/FreelancerOnboarding/FreelancerOnboarding";
// AI Tools
import BuddyAI from "../pages/public/AiTools/BuddyAI";
import CostEstimator from "../pages/public/AiTools/CostEstimator";
import CategoryPage from "../pages/public/Skills/CategoryPage";
import SkillPage from "../pages/public/Skills/SkillPage";

// Fallback
import NotFound from "../pages/public/NotFound/NotFound";

/**
 * Sends unknown routes to /404 so the address bar reflects the error, while
 * passing the attempted path along in history state so the page can show what
 * was actually requested (the redirect would otherwise discard it).
 * `replace` keeps the bad URL out of history, so Back doesn't bounce here again.
 */
const RedirectTo404 = () => {
  const location = useLocation();
  return (
    <Navigate
      to="/404"
      replace
      state={{ from: `${location.pathname}${location.search}` }}
    />
  );
};

const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
      <ClientProvider>
        <FreelancerProvider>
        <Routes>

          {/* ================= ADMIN PANEL ROUTES ================= */}
          {/* Login — public, no layout wrapper */}
          <Route path="/admin-panel/login" element={<AdminLogin />} />

          {/* Protected admin panel — all under /admin-panel/* */}
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

          {/* ================= PUBLIC ROUTES =================
              The mobile (Capacitor) build has NO public/marketing screens —
              only the auth flow + the client/freelancer/admin-panel panels.
              `isMobileApp()` is evaluated once per render, not per-route, so
              this can't drift between routes; the excluded routes below
              aren't just hidden from nav, they're never registered at all in
              that build, so a stray deep-link to e.g. /browse-projects falls
              through to the catch-all 404 instead of rendering. */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={isMobileApp() ? <Navigate to="/login" replace /> : <Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registration" element={<Registration />} />
            {/* Back-compat alias so any /register link resolves instead of 404ing */}
            <Route path="/register" element={<Navigate to="/registration" replace />} />
            <Route path="/role" element={<Role />} />
            <Route path="/auth/consent" element={<AuthConsent />} />
            <Route path="/otp-verification" element={<OTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/client/onboarding"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/onboarding"
              element={
                <ProtectedRoute allowedRoles={['freelancer']}>
                  <FreelancerOnboarding />
                </ProtectedRoute>
              }
            />

            {!isMobileApp() && (
              <>
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/services-agreement" element={<ServicesAgreement />} />

                <Route path="/browse-freelancers" element={<BrowseFreelancers />} />
                <Route path="/post-project" element={<PostProject />} />
                <Route path="/ai-matchmaking" element={<AiMatchmaking />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/browse-projects" element={<BrowseProjects />} />
                <Route path="/jobs/:id" element={<JobDetails />} />
                <Route path="/gigs/:id" element={<GigDetail />} />
                {/* AI Tools */}
                <Route path="/ai/buddy" element={<BuddyAI />} />
                <Route path="/ai/cost-estimator" element={<CostEstimator />} />
                {/* Skills / Category / Gig Pages */}
                <Route path="/skills/:categorySlug" element={<CategoryPage />} />
                <Route path="/skills/:categorySlug/:skillSlug" element={<SkillPage />} />

                <Route path="/freelancers/:id" element={<PublicFreelancerProfile />} />
                <Route path="/clients/:id" element={<PublicClientProfile />} />
              </>
            )}
          </Route>

          {/* Payment confirmation landing (Stripe success redirect). Standalone,
              no layout chrome — must be logged in as the paying client. */}
          <Route
            path="/payment/confirm"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <PaymentConfirm />
              </ProtectedRoute>
            }
          />

          {/* ================= FREELANCER ROUTES ================= */}
          <Route
            path="/freelancer"
            element={
              <ProtectedRoute allowedRoles={['freelancer']}>
                <FreelancerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/freelancer/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="profile" element={<FreelancerProfile />} />
            <Route path="settings" element={<FreelancerSettings />} />
            <Route path="security" element={<FreelancerSecurity />} />
            <Route path="gigs" element={<FreelancerGigs />} />
            <Route path="gigs/create" element={<CreateGig />} />
            <Route path="portfolio" element={<FreelancerPortfolio />} />
            <Route path="messages" element={<FreelancerMessages />} />
            <Route path="saved" element={<FreelancerSavedProjects />} />
            <Route path="proposals" element={<FreelancerProposals />} />
            <Route path="work" element={<FreelancerWork />} />
            <Route path="wallet" element={<FreelancerWallet />} />
            <Route path="wallet/stripe-callback" element={<StripeCallback />} />
            <Route path="skill-test" element={<SkillTest />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* ================= CLIENT ROUTES ================= */}
          <Route
            path="/client"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/client/dashboard" replace />} />
            <Route path="dashboard" element={<ClientDashboardOverview />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="settings" element={<ClientSettings />} />
            <Route path="security" element={<ClientSecurity />} />
            <Route path="projects" element={<ClientProjects />} />
            <Route path="projects/create" element={<ClientPostProject />} />
            <Route path="saved" element={<ClientSavedFreelancers />} />
            <Route path="wallet" element={<ClientWallet />} />
            <Route path="messages" element={<ClientMessages />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="projects/:jobId/proposals" element={<ReviewProposals />} />
          </Route>

          {/* ================= ADMIN ROUTES (marketplace taxonomy) =================
              Legacy content-editor tool, distinct from the isolated
              /admin-panel/* system — not one of the three panels (admin
              panel, freelancer, client) the mobile app ships with. */}
          {!isMobileApp() && (
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/taxonomy" replace />} />
              <Route path="taxonomy" element={<TaxonomyAdmin />} />
            </Route>
          )}

          <Route path="/unauthorized" element={<h1>403 – Unauthorized</h1>} />
          {/* 404 — directly linkable, and where unknown routes land */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<RedirectTo404 />} />
        </Routes>
      </FreelancerProvider>
    </ClientProvider>
    </AdminAuthProvider>
    </ErrorBoundary>
  );
};

export default AppRoutes;
