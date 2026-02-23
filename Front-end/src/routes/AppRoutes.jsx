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
        {/* <Route path="/about" element={<ProtectedRoute allowedRoles={['client']}><About /></ProtectedRoute>} /> Protected Route Example */}
      </Route>


      {/* ================= SYSTEM ROUTES ================= */}
      <Route path="/unauthorized" element={<h1>403 – Unauthorized</h1>} />
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};
export default AppRoutes;
