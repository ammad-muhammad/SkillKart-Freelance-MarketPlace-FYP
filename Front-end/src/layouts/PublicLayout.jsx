import { Outlet } from "react-router-dom";
import PublicHeader from "../Components/public/PublicHeader/PublicHeader";
import PublicFooter from "../Components/public/PublicFooter/PublicFooter";

const PublicLayout = () => (
  <>
    <PublicHeader />
    <main>
      <Outlet />
    </main>
    <PublicFooter />
  </>
);

export default PublicLayout;