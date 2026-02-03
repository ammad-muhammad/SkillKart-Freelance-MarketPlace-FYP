import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { CMSProvider } from "./cms/context/CMSContext";
import { useAuth } from "./auth/useAuth";
import LenisScroller from "./Components/common/Lenis/LenisScroller";
import ScrollToTop from "./Components/common/ScrollToTop/ScrollToTop";

function App() {
  const { user } = useAuth();

  return (
    <LenisScroller>
      <BrowserRouter>
        <ScrollToTop />
        <CMSProvider>
          <AppRoutes userRole={user?.role || null} />
        </CMSProvider>
      </BrowserRouter>
    </LenisScroller>
    
  );
}

export default App;
