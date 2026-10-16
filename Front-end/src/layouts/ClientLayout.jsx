import { Outlet, Navigate } from 'react-router-dom';
import { ClientProvider, useClient } from '../context/ClientContext';
import AppNavbar from '../Components/common/AppNavbar/AppNavbar';
import usePageTitle from '../hooks/usePageTitle';
import { useAuth } from '../hooks/useAuth';
import Loader from '../Components/common/Loader/Loader';
import '../styles/freelancer-ds.css';
import './FreelancerLayout.css';
import './ClientLayout.css';

const ClientLayoutInner = () => {
  const { user, loading } = useAuth();
  usePageTitle('/client');

  if (loading) {
    return <Loader text="Loading" fullScreen={true} />;
  }

  return (
    <div className="app-shell">
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
