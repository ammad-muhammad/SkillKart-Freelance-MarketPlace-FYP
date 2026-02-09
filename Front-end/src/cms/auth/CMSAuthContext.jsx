
import { createContext, useContext, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

const CMSAuthContext = createContext(null);

export const useCMSAuth = () => {
  const context = useContext(CMSAuthContext);
  if (!context) {
    throw new Error("useCMSAuth must be used within a CMSAuthProvider");
  }
  return context;
};

// Hardcoded Credentials
const ADMIN_CREDS = {
  username: "admin_master",
  password: "sk_admin_secure",
  role: "ADMIN"
};

const CMS_CREDS = {
  username: "cms_editor",
  password: "sk_cms_secure",
  role: "CMS_EDITOR"
};

export const CMSAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [cmsUser, setCmsUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const storedAdmin = localStorage.getItem("sk_admin_token");
    const storedCMS = localStorage.getItem("sk_cms_token");

    if (storedAdmin) {
      try {
        setAdminUser(JSON.parse(storedAdmin));
      } catch (e) {
        localStorage.removeItem("sk_admin_token");
      }
    }

    if (storedCMS) {
      try {
        setCmsUser(JSON.parse(storedCMS));
      } catch (e) {
        localStorage.removeItem("sk_cms_token");
      }
    }
    setIsLoading(false);
  }, []);

  const loginAdmin = (username, password) => {
    if (username === ADMIN_CREDS.username && password === ADMIN_CREDS.password) {
      const user = { username, role: ADMIN_CREDS.role, timestamp: Date.now() };
      setAdminUser(user);
      localStorage.setItem("sk_admin_token", JSON.stringify(user));
      return { success: true };
    }
    return { success: false, error: "Invalid admin credentials" };
  };

  const loginCMS = (username, password) => {
    if (username === CMS_CREDS.username && password === CMS_CREDS.password) {
      const user = { username, role: CMS_CREDS.role, timestamp: Date.now() };
      setCmsUser(user);
      localStorage.setItem("sk_cms_token", JSON.stringify(user));
      return { success: true };
    }
    return { success: false, error: "Invalid CMS credentials" };
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem("sk_admin_token");
  };

  const logoutCMS = () => {
    setCmsUser(null);
    localStorage.removeItem("sk_cms_token");
  };

  const value = {
    adminUser,
    cmsUser,
    loginAdmin,
    loginCMS,
    logoutAdmin,
    logoutCMS,
    isLoading
  };

  return (
    <CMSAuthContext.Provider value={value}>
      {children}
    </CMSAuthContext.Provider>
  );
};

// ================= PROTECTED ROUTES =================

export const AdminProtectedRoute = ({ children }) => {
  const { adminUser, isLoading } = useCMSAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!adminUser) {
    return <Navigate to="/sk-admin-access/login-portal-92x" state={{ from: location }} replace />;
  }

  return children;
};

export const CMSProtectedRoute = ({ children }) => {
  const { cmsUser, isLoading } = useCMSAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!cmsUser) {
    return <Navigate to="/sk-cms-access/content-core-login-x91" state={{ from: location }} replace />;
  }

  return children;
};
