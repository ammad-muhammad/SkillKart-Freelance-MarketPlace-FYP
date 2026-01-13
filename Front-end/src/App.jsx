import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./auth/useAuth";

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <AppRoutes userRole={user?.role || null} />
    </BrowserRouter>
  );
}

export default App;
