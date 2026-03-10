import { Routes, Route, Navigate } from "react-router-dom"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from '../hooks/ProtectedRoute';
import { ClientProvider } from '../context/ClientContext';
import { FreelancerProvider } from '../context/FreelancerContext';

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import AdminLayout from "../layouts/AdminLayout";
import FreelancerLayout from "../layouts/FreelancerLayout";

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

// Public Pages
import Home from "../pages/public/Home/Home";
import Login from "../pages/public/Login/Login";
import AuthConsent from "../pages/public/AuthConsent/AuthConsent";
import Login1 from "../pages/public/Login/login-1";
import Registration from "../pages/public/Register/Registration";
import OTP from "../pages/public/OTP/OTP";
import ForgotPassword from "../pages/public/ForgotPassword/ForgotPassword";
import About from "../pages/public/About/About";
import Contact from "../pages/public/Contact/Contact";
import PrivacyPolicy from "../pages/public/Legal/PrivacyPolicy";
import TermsOfService from "../pages/public/Legal/TermsOfService";
import CookiePolicy from "../pages/public/Legal/CookiePolicy";
import ServicesAgreement from "../pages/public/Legal/ServicesAgreement";
import Blog from "../pages/public/Blog/Blog";
import Careers from "../pages/public/Careers/Careers";
import PressKit from "../pages/public/PressKit/PressKit";
import BrowseFreelancers from "../pages/public/BrowseFreelancers/BrowseFreelancers";
import PostProject from "../pages/public/PostProject/PostProject";
import AiMatchmaking from "../pages/public/AiMatchmaking/AiMatchmaking";
import Community from "../pages/public/Community/Community";
import HelpCenter from "../pages/public/HelpCenter/HelpCenter";

//Sumair - work
// import TermsAndConditions from "../pages/public/TermsAndConditions";
// import PrivacyPolicy from "../pages/public/PrivacyPolicy";
import ClientOnboarding from "../pages/public/ClientOnboarding/ClientOnboarding";
import Onboarding from "../pages/public/Onboarding/Onboarding";
// AI Tools
import VerifyCredentials from "../pages/public/AiTools/VerifyCredentials";
import BuddyAI from "../pages/public/AiTools/BuddyAI";
import ProfileAnalyzer from "../pages/public/AiTools/ProfileAnalyzer";
import CostEstimator from "../pages/public/AiTools/CostEstimator";

// Fallback
const NotFound = () => <h1>404 – Page Not Found</h1>;

const AppRoutes = () => {
  return (
    <ClientProvider>
      <FreelancerProvider>
        <Routes>

          {/* ================= PUBLIC ROUTES ================= */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/auth/consent" element={<AuthConsent />} />
            <Route path="/login-1" element={<Login1 />} />
            <Route path="/otp-verification" element={<OTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/services-agreement" element={<ServicesAgreement />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/press" element={<PressKit />} />
            <Route path="/browse-freelancers" element={<BrowseFreelancers />} />
            <Route path="/post-project" element={<PostProject />} />
            <Route path="/ai-matchmaking" element={<AiMatchmaking />} />
            <Route path="/community" element={<Community />} />
            <Route path="/help" element={<HelpCenter />} />
            {/* //Sumair - working */}
            {/* <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} /> */}
            <Route path="/client/onboarding" element={<ClientOnboarding />} />
            <Route path="/onboarding" element={<Onboarding />} />
            {/* <Route path="/about" element={<ProtectedRoute allowedRoles={['client']}><About /></ProtectedRoute>} /> Protected Route Example */}
            {/* AI Tools */}
            <Route path="/ai/verify" element={<VerifyCredentials />} />
            <Route path="/ai/buddy" element={<BuddyAI />} />
            <Route path="/ai/profile-analyzer" element={<ProfileAnalyzer />} />
            <Route path="/ai/cost-estimator" element={<CostEstimator />} />
          </Route>

          {/* ================= FREELANCER ROUTES ================= */}
          <Route path="/freelancer" element={<FreelancerLayout />}>
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
          </Route>

          {/* ================= CLIENT ROUTES ================= */}
          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<Navigate to="/client/dashboard" replace />} />
            <Route path="dashboard" element={<ClientDashboardOverview />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="settings" element={<ClientSettings />} />
            <Route path="security" element={<ClientSecurity />} />
            <Route path="projects" element={<ClientProjects />} />
            <Route path="projects/create" element={<ClientPostProject />} />
            <Route path="saved" element={<ClientSavedFreelancers />} />
            <Route path="messages" element={<ClientMessages />} />
          </Route>

          <Route path="/unauthorized" element={<h1>403 – Unauthorized</h1>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </FreelancerProvider>
    </ClientProvider >
  );
};

export default AppRoutes;
