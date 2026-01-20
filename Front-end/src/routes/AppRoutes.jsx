import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ROLES } from "../auth/roles";
import RequireAuth from "../auth/RequireAuth";

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import AdminLayout from "../layouts/AdminLayout";

// Public Pages
import Home from "../pages/public/Home";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";

// Freelancer Pages
import FreelancerDashboard from "../pages/freelancer/Dashboard";
import Gigs from "../pages/freelancer/Gigs";

// Client Pages
import ClientDashboard from "../pages/client/Dashboard";
import Orders from "../pages/client/Orders";

// Admin Pages
import AdminDashboard from "../pages/admin/Dashboard";
import Users from "../pages/admin/Users";
import PrivacyPolicy from "../pages/public/PrivacyPolicy";
import TermsOfServices from "../pages/public/TermsOfServices";

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

      {/* ================= ADMIN ROUTES ================= */}
      <Route
        element={
          <RequireAuth
            userRole={userRole}
            allowedRoles={[ROLES.ADMIN]}
          >
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<Users />} />
      </Route>

      {/* ================= SYSTEM ROUTES ================= */}
      <Route path="/unauthorized" element={<h1>403 – Unauthorized</h1>} />
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};

export default AppRoutes;
