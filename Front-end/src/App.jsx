import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./auth/useAuth";
import LenisScroller from "./Components/common/Lenis/LenisScroller";

function App() {
  const { user } = useAuth();

  return (
    <LenisScroller>
      <BrowserRouter>
        <AppRoutes userRole={user?.role || null} />
      </BrowserRouter>
    </LenisScroller>
  );
}

export default App;
