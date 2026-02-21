import { useEffect, useRef } from 'react';
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./hooks/useAuth";
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
            <AppRoutes/>
      </BrowserRouter>
  );
}

export default App;
