import { Outlet, useLocation } from 'react-router-dom';
import { FreelancerProvider } from '../context/FreelancerContext';
import AppNavbar from '../Components/common/AppNavbar/AppNavbar';
import usePageTitle from '../hooks/usePageTitle';
import '../styles/freelancer-ds.css';
import './FreelancerLayout.css';

const FreelancerLayoutInner = () => {
  usePageTitle('/freelancer');
  const { pathname } = useLocation();
  // Full-bleed messenger: flag the shell by route so the edge-to-edge layout
  // doesn't depend on CSS :has() (missing from older Android WebViews).
  const flush = /\/messages(\/|$)/.test(pathname);

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

const FreelancerLayout = () => (
  <FreelancerProvider>
    <FreelancerLayoutInner />
  </FreelancerProvider>
);

export default FreelancerLayout;
