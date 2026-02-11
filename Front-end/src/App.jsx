import { useEffect, useRef } from 'react';
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { CMSProvider } from "./cms/context/CMSContext";
import { useAuth } from "./hooks/useAuth";
import LenisScroller from "./Components/common/Lenis/LenisScroller";
import ScrollToTop from "./Components/common/ScrollToTop/ScrollToTop";
import { log, logStatus } from './utils/logger';

import { CMSAuthProvider } from "./cms/auth/CMSAuthContext"; // Import Auth Provider

function App() {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    log('💻 Frontend running on port 3001');
    logStatus({ debugMode: true, hotReloadWorking: true });
  }, []);

  return (
    <LenisScroller>
      <BrowserRouter>
        <ScrollToTop />
        <CMSAuthProvider>
          <CMSProvider>
            <AppRoutes/>
          </CMSProvider>
        </CMSAuthProvider>
      </BrowserRouter>
    </LenisScroller>
    
  );
}

export default App;
