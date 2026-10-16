import { Outlet, Navigate } from 'react-router-dom';
import { FreelancerProvider, useFreelancer } from '../context/FreelancerContext';
import AppNavbar from '../Components/common/AppNavbar/AppNavbar';
import usePageTitle from '../hooks/usePageTitle';
import { useAuth } from '../hooks/useAuth';
import Loader from '../Components/common/Loader/Loader';
import '../styles/freelancer-ds.css';
import './FreelancerLayout.css';

const FreelancerLayoutInner = () => {
  const { user, loading } = useAuth();
  usePageTitle('/freelancer');

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

const FreelancerLayout = () => (
  <FreelancerProvider>
    <FreelancerLayoutInner />
  </FreelancerProvider>
);

export default FreelancerLayout;
