import { Routes, Route, Navigate } from "react-router-dom";
import { ROLES } from "../auth/roles";
import RequireAuth from "../auth/RequireAuth";
// fdgfdg

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import AdminLayout from "../layouts/AdminLayout";
import CMSLayout from "../cms/layouts/CMSLayout";

// CMS Pages
import CMSDashboard from "../cms/pages/CMSDashboard";
import ContentStats from "../cms/pages/ContentStats";
import HomePageEditor from "../cms/pages/pages/HomePageEditor";
import AboutPageEditor from "../cms/pages/pages/AboutPageEditor";
import ContactPageEditor from "../cms/pages/pages/ContactPageEditor";
import HowItWorksEditor from "../cms/pages/pages/HowItWorksEditor";
import PrivacyPolicyEditor from "../cms/pages/pages/PrivacyPolicyEditor";
import TermsOfServiceEditor from "../cms/pages/pages/TermsOfServiceEditor";
import LoginPageEditor from "../cms/pages/pages/LoginPageEditor";
import RegisterPageEditor from "../cms/pages/pages/RegisterPageEditor";
import ComponentsManager from "../cms/pages/ComponentsManager";
import MediaManager from "../cms/pages/MediaManager";
import FormsManager from "../cms/pages/FormsManager";
import CMSSettings from "../cms/pages/CMSSettings";

// Public Pages
import Home from "../pages/public/Home";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";
import PrivacyPolicy from "../pages/public/PrivacyPolicy";
import TermsOfServices from "../pages/public/TermsOfServices";
import HowItWorks from "../pages/public/HowItWorks";
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";

// Freelancer Pages
import FreelancerDashboard from "../pages/freelancer/Dashboard";
import Gigs from "../pages/freelancer/Gigs";

// Client Pages
import ClientDashboard from "../pages/client/Dashboard";
import Orders from "../pages/client/Orders";

// Admin Pages - Dashboard
import AdminDashboard from "../pages/admin/Dashboard";
import Users from "../pages/admin/Users";

// Admin Pages - Freelancers
import AllFreelancers from "../pages/admin/freelancers/AllFreelancers";
import VerifiedFreelancers from "../pages/admin/freelancers/VerifiedFreelancers";
import SkillTests from "../pages/admin/freelancers/SkillTests";
import FreelancerGigs from "../pages/admin/freelancers/FreelancerGigs";
import FreelancerProjects from "../pages/admin/freelancers/FreelancerProjects";
import Rankings from "../pages/admin/freelancers/Rankings";
import FreelancerPayments from "../pages/admin/freelancers/FreelancerPayments";
import FreelancerDisputes from "../pages/admin/freelancers/FreelancerDisputes";

// Admin Pages - Clients
import AllClients from "../pages/admin/clients/AllClients";
import ClientProjects from "../pages/admin/clients/ClientProjects";
import ClientPayments from "../pages/admin/clients/ClientPayments";
import ClientDisputes from "../pages/admin/clients/ClientDisputes";

// Admin Pages - Products
import ProductsList from "../pages/admin/products/ProductsList";
import ProductReviews from "../pages/admin/products/ProductReviews";
import ProductApprovals from "../pages/admin/products/ProductApprovals";
import ProductPayments from "../pages/admin/products/ProductPayments";

// Admin Pages - Transactions
import FreelancePaymentsPage from "../pages/admin/transactions/FreelancePayments";
import ProductTransactions from "../pages/admin/transactions/ProductTransactions";
import Withdrawals from "../pages/admin/transactions/Withdrawals";

// Admin Pages - Disputes
import ActiveDisputes from "../pages/admin/disputes/ActiveDisputes";
import ResolvedDisputes from "../pages/admin/disputes/ResolvedDisputes";
import RefundDecisions from "../pages/admin/disputes/RefundDecisions";

// Admin Pages - AI
import AIRecommendations from "../pages/admin/ai/AIRecommendations";
import SkillDemand from "../pages/admin/ai/SkillDemand";
import PricingSuggestions from "../pages/admin/ai/PricingSuggestions";

// Admin Pages - Settings
import PlatformRules from "../pages/admin/settings/PlatformRules";
import VerificationRules from "../pages/admin/settings/VerificationRules";
import PaymentRules from "../pages/admin/settings/PaymentRules";

// Fallback
const NotFound = () => <h1>404 – Page Not Found</h1>;

const AppRoutes = ({ userRole }) => {
  return (
    <Routes>

      {/* ================= PUBLIC ROUTES ================= */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsOfServices />} />
        <Route path="/howitworks" element={<HowItWorks />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* ================= ADMIN TESTING ROUTES (PUBLIC ACCESS) ================= */}
      <Route element={<AdminLayout />}>
        {/* Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<Users />} />

        {/* Freelancers Section */}
        <Route path="/admin/freelancers" element={<AllFreelancers />} />
        <Route path="/admin/freelancers/verified" element={<VerifiedFreelancers />} />
        <Route path="/admin/freelancers/skill-tests" element={<SkillTests />} />
        <Route path="/admin/freelancers/gigs" element={<FreelancerGigs />} />
        <Route path="/admin/freelancers/projects" element={<FreelancerProjects />} />
        <Route path="/admin/freelancers/rankings" element={<Rankings />} />
        <Route path="/admin/freelancers/payments" element={<FreelancerPayments />} />
        <Route path="/admin/freelancers/disputes" element={<FreelancerDisputes />} />

        {/* Clients Section */}
        <Route path="/admin/clients" element={<AllClients />} />
        <Route path="/admin/clients/projects" element={<ClientProjects />} />
        <Route path="/admin/clients/payments" element={<ClientPayments />} />
        <Route path="/admin/clients/disputes" element={<ClientDisputes />} />

        {/* Products Section */}
        <Route path="/admin/products" element={<ProductsList />} />
        <Route path="/admin/products/reviews" element={<ProductReviews />} />
        <Route path="/admin/products/approvals" element={<ProductApprovals />} />
        <Route path="/admin/products/payments" element={<ProductPayments />} />

        {/* Transactions Section */}
        <Route path="/admin/transactions/freelance" element={<FreelancePaymentsPage />} />
        <Route path="/admin/transactions/products" element={<ProductTransactions />} />
        <Route path="/admin/transactions/withdrawals" element={<Withdrawals />} />

        {/* Disputes Section */}
        <Route path="/admin/disputes/active" element={<ActiveDisputes />} />
        <Route path="/admin/disputes/resolved" element={<ResolvedDisputes />} />
        <Route path="/admin/disputes/refunds" element={<RefundDecisions />} />

        {/* AI Assistance Section */}
        <Route path="/admin/ai/recommendations" element={<AIRecommendations />} />
        <Route path="/admin/ai/skill-demand" element={<SkillDemand />} />
        <Route path="/admin/ai/pricing" element={<PricingSuggestions />} />

        {/* Settings Section */}
        <Route path="/admin/settings/platform" element={<PlatformRules />} />
        <Route path="/admin/settings/verification" element={<VerificationRules />} />
        <Route path="/admin/settings/payments" element={<PaymentRules />} />
      </Route>

      {/* ================= CMS ROUTES (PUBLIC ACCESS) ================= */}
      <Route element={<CMSLayout />}>
        {/* Dashboard */}
        <Route path="/cms" element={<CMSDashboard />} />
        <Route path="/cms/stats" element={<ContentStats />} />

        {/* Page Editors */}
        <Route path="/cms/pages/home" element={<HomePageEditor />} />
        <Route path="/cms/pages/about" element={<AboutPageEditor />} />
        <Route path="/cms/pages/contact" element={<ContactPageEditor />} />
        <Route path="/cms/pages/howitworks" element={<HowItWorksEditor />} />
        <Route path="/cms/pages/privacypolicy" element={<PrivacyPolicyEditor />} />
        <Route path="/cms/pages/termsofservice" element={<TermsOfServiceEditor />} />
        <Route path="/cms/pages/login" element={<LoginPageEditor />} />
        <Route path="/cms/pages/register" element={<RegisterPageEditor />} />

        {/* Components Manager */}
        <Route path="/cms/components" element={<ComponentsManager />} />
        <Route path="/cms/components/navbar" element={<ComponentsManager />} />
        <Route path="/cms/components/footer" element={<ComponentsManager />} />
        <Route path="/cms/components/buttons" element={<ComponentsManager />} />
        <Route path="/cms/components/cards" element={<ComponentsManager />} />
        <Route path="/cms/components/cta" element={<ComponentsManager />} />

        {/* Media Manager */}
        <Route path="/cms/media" element={<MediaManager />} />

        {/* Forms Manager */}
        <Route path="/cms/forms" element={<FormsManager />} />

        {/* Settings */}
        <Route path="/cms/settings" element={<CMSSettings />} />
      </Route>

      {/* ================= APP ROUTES (FREELANCER + CLIENT) ================= */}
      <Route
        element={
          <RequireAuth
            userRole={userRole}
            allowedRoles={[ROLES.FREELANCER, ROLES.CLIENT]}
          >
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* Freelancer */}
        <Route
          path="/freelancer"
          element={
            userRole === ROLES.FREELANCER
              ? <FreelancerDashboard />
              : <Navigate to="/unauthorized" />
          }
        />
        <Route
          path="/freelancer/gigs"
          element={
            userRole === ROLES.FREELANCER
              ? <Gigs />
              : <Navigate to="/unauthorized" />
          }
        />

        {/* Client */}
        <Route
          path="/client"
          element={
            userRole === ROLES.CLIENT
              ? <ClientDashboard />
              : <Navigate to="/unauthorized" />
          }
        />
        <Route
          path="/client/orders"
          element={
            userRole === ROLES.CLIENT
              ? <Orders />
              : <Navigate to="/unauthorized" />
          }
        />
      </Route>

      {/* ================= SYSTEM ROUTES ================= */}
      <Route path="/unauthorized" element={<h1>403 – Unauthorized</h1>} />
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};

export default AppRoutes;
