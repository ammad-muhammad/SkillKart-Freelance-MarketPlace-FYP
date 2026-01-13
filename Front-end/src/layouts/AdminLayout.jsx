import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div>
      <Outlet /> {/* Admin pages render here */}
    </div>
  );
};

export default AdminLayout;
