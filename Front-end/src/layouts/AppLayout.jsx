import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <div>
      <Outlet /> {/* Freelancer or Client pages render here */}
    </div>
  );
};

export default AppLayout;
