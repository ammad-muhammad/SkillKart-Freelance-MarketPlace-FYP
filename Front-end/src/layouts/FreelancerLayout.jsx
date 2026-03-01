import { Outlet } from 'react-router-dom';
import { FreelancerProvider, useFreelancer } from '../context/FreelancerContext';
import FreelancerSidebar from '../pages/freelancer/components/FreelancerSidebar';
import ToastStack from '../pages/freelancer/components/ToastStack';
import './FreelancerLayout.css';

const FreelancerLayoutInner = () => {
  const { toasts } = useFreelancer();
  return (
    <div className="fl-layout">
      <FreelancerSidebar />
      <div className="fl-main">
        <Outlet />
      </div>
      <ToastStack toasts={toasts} />
    </div>
  );
};

const FreelancerLayout = () => (
  <FreelancerProvider>
    <FreelancerLayoutInner />
  </FreelancerProvider>
);

export default FreelancerLayout;
