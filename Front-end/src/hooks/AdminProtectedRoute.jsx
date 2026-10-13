import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

/**
 * AdminProtectedRoute
 * Wraps admin panel pages. Redirects to /admin-panel/login if not authenticated.
 * Shows a minimal loader while the initial session check is pending.
 */
const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0f1e',
        color: '#3b82f6',
        fontSize: '1.2rem',
        fontFamily: 'Inter, sans-serif',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⟳</span>
        Verifying session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-panel/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
