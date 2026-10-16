import { Outlet } from 'react-router-dom';
import { FreelancerProvider, useFreelancer } from '../context/FreelancerContext';
import AppNavbar from '../Components/common/AppNavbar/AppNavbar';
import usePageTitle from '../hooks/usePageTitle';
import '../styles/freelancer-ds.css';
import './FreelancerLayout.css';

const FreelancerLayoutInner = () => {
  usePageTitle('/freelancer');

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

const FreelancerLayout = () => (
  <FreelancerProvider>
    <FreelancerLayoutInner />
  </FreelancerProvider>
);

export default FreelancerLayout;
