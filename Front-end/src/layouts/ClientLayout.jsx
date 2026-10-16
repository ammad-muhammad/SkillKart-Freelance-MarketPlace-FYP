import { Outlet, useLocation } from 'react-router-dom';
import { ClientProvider } from '../context/ClientContext';
import AppNavbar from '../Components/common/AppNavbar/AppNavbar';
import usePageTitle from '../hooks/usePageTitle';
import { useAuth } from '../hooks/useAuth';
import Loader from '../Components/common/Loader/Loader';
import '../styles/freelancer-ds.css';
import './FreelancerLayout.css';
import './ClientLayout.css';

const ClientLayoutInner = () => {
  const { loading } = useAuth();
  usePageTitle('/client');
  const { pathname } = useLocation();
  // Full-bleed messenger: flag the shell by route so the edge-to-edge layout
  // doesn't depend on CSS :has() (missing from older Android WebViews).
  const flush = /\/messages(\/|$)/.test(pathname);

  if (loading) {
    return <Loader text="Loading" fullScreen={true} />;
  }

  return (
    <div className={`app-shell${flush ? ' app-shell--flush' : ''}`}>
      {/* Shared Logged-In Navbar */}
      <AppNavbar />

      {/* Main Content Area */}
      <main className="app-shell__main">
        <div className="app-shell__container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const ClientLayout = () => (
  <ClientProvider>
    <ClientLayoutInner />
  </ClientProvider>
);

export default ClientLayout;
