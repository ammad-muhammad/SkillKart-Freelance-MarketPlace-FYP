import { Outlet } from 'react-router-dom';
import { ClientProvider, useClient } from '../context/ClientContext';
import ClientSidebar from '../pages/client/components/ClientSidebar';
import ToastStack from '../Components/common/ToastStack/ToastStack';
import usePageTitle from '../hooks/usePageTitle';
import './ClientLayout.css';

const ClientLayoutInner = () => {
  const { toasts } = useClient();
  usePageTitle('/client');
  return (
    <div className="cl-layout">
      <ClientSidebar />
      <div className="cl-main">
        <Outlet />
      </div>
      <ToastStack toasts={toasts} />
    </div>
  );
};

const ClientLayout = () => (
  <ClientProvider>
    <ClientLayoutInner />
  </ClientProvider>
);

export default ClientLayout;
