import { Navigate } from "react-router-dom";

const RequireAuth = ({ allowedRoles, userRole, children }) => {
  if (!userRole) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(userRole)) return <Navigate to="/unauthorized" replace />;

  return children;
};

export default RequireAuth;