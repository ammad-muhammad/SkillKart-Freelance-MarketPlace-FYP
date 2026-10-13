import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

const PublicLayout = () => {
  const location = useLocation();

  // index.html ships a static canonical <link>, which told crawlers every
  // single public page (jobs, gigs, freelancer/client profiles — the exact
  // set the backend sitemap tries to get indexed) was a duplicate of the
  // homepage. Keep it in sync with the actual route instead.
  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]');
    if (link) {
      link.href = `${window.location.origin}${location.pathname}`;
    }
  }, [location.pathname]);

  return (
    <>
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default PublicLayout;