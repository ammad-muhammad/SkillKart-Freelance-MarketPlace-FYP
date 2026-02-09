import { Outlet, useLocation } from "react-router-dom";
import PublicHeader from "../Components/public/PublicHeader/PublicHeader";
import PublicFooter from "../Components/public/PublicFooter/PublicFooter";

const PublicLayout = () => {
  const location = useLocation();
  const hideLayout = location.pathname === "/login" || location.pathname === "/register";

  return (
    <>
      {!hideLayout && <PublicHeader />}
      <main>
        <Outlet />
      </main>
      {!hideLayout && <PublicFooter />}
    </>
  );
};

export default PublicLayout;