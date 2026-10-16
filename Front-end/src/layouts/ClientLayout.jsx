import { Outlet } from 'react-router-dom';
import { ClientProvider, useClient } from '../context/ClientContext';
import AppNavbar from '../Components/common/AppNavbar/AppNavbar';
import usePageTitle from '../hooks/usePageTitle';
import '../styles/freelancer-ds.css';
import './FreelancerLayout.css';
import './ClientLayout.css';

const ClientLayoutInner = () => {
  usePageTitle('/client');

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
