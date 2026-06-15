import { useEffect, useRef } from 'react';
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import ScrollToTop from "./Components/common/ScrollToTop/ScrollToTop";
import BuddyWidget from "./Components/common/BuddyWidget/BuddyWidget";
import { log, logStatus } from './utils/logger';

function App() {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    log('💻 Frontend running on port 3001');
    logStatus({ debugMode: true, hotReloadWorking: true });
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
      <BuddyWidget />
    </BrowserRouter>
  );
}

export default App;
