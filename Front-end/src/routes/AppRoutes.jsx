import { Routes, Route, Navigate } from "react-router-dom"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from '../hooks/ProtectedRoute';

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import AdminLayout from "../layouts/AdminLayout";

// Public Pages
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";
import OTPLogin from "../pages/public/Otp-login";
import AuthConsent from "../pages/public/AuthConsent";
import Login1 from "../pages/public/login-1";
import Registration1 from "../pages/public/registration-1";
import OTP from "../pages/public/OTP";
import ForgotPassword from "../pages/public/ForgotPassword";
import About from "../pages/public/About/About";
import Contact from "../pages/public/Contact/Contact";
import PrivacyPolicy from "../pages/public/Legal/PrivacyPolicy";
import TermsOfService from "../pages/public/Legal/TermsOfService";
import CookiePolicy from "../pages/public/Legal/CookiePolicy";
import Blog from "../pages/public/Blog/Blog";
import Careers from "../pages/public/Careers/Careers";
import PressKit from "../pages/public/PressKit/PressKit";
import BrowseFreelancers from "../pages/public/BrowseFreelancers/BrowseFreelancers";
import PostProject from "../pages/public/PostProject/PostProject";
import AiMatchmaking from "../pages/public/AiMatchmaking/AiMatchmaking";
import Community from "../pages/public/Community/Community";
import HelpCenter from "../pages/public/HelpCenter/HelpCenter";

// Fallback
const NotFound = () => <h1>404 – Page Not Found</h1>;

const AppRoutes = () => {
  return (
    <Routes>
      {/* <ToastContainer position="top-right" autoClose={3000} /> */}

      {/* ================= PUBLIC ROUTES ================= */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/otp" element={<OTPLogin />} />
        <Route path="/auth/consent" element={<AuthConsent />} />
        <Route path="/login-1" element={<Login1 />} />
        <Route path="/register-1" element={<Registration1 />} />
        <Route path="/otp-verification" element={<OTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/press" element={<PressKit />} />
        <Route path="/browse-freelancers" element={<BrowseFreelancers />} />
        <Route path="/post-project" element={<PostProject />} />
        <Route path="/ai-matchmaking" element={<AiMatchmaking />} />
        <Route path="/community" element={<Community />} />
        <Route path="/help" element={<HelpCenter />} />
        {/* <Route path="/about" element={<ProtectedRoute allowedRoles={['client']}><About /></ProtectedRoute>} /> Protected Route Example */}
      </Route>


      {/* ================= SYSTEM ROUTES ================= */}
      <Route path="/unauthorized" element={<h1>403 – Unauthorized</h1>} />
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};

export default AppRoutes;
