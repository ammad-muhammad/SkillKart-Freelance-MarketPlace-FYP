import { Outlet, useLocation } from "react-router-dom";

const PublicLayout = () => {
  const location = useLocation();
  const hideLayout = location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/otp";

  return (
    <>
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default PublicLayout;