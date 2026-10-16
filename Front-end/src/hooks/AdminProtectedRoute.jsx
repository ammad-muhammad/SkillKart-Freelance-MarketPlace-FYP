import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import Loader from '../Components/common/Loader/Loader';

/**
 * AdminProtectedRoute
 * Wraps admin panel pages. Redirects to /admin-panel/login if not authenticated.
 * Shows the unified loader while the initial session check is pending.
 */
const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return <Loader fullScreen text="Verifying" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-panel/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
