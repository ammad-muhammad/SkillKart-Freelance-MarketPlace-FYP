import Loader from '../Components/common/Loader/Loader';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader text="Loading" fullScreen={true} />;
  }

  if (!user) {
    // Capture where they were headed so Login.jsx's existing
    // postLoginRedirect handling sends them back here after logging in —
    // previously only 3 hand-wired CTAs (Apply Now, Order Gig, Post Project)
    // did this themselves; every other protected route just dropped the
    // destination and always landed the user on the generic dashboard.
    try {
      sessionStorage.setItem('postLoginRedirect', `${location.pathname}${location.search}`);
    } catch { /* sessionStorage unavailable (e.g. private browsing) — non-fatal */ }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;