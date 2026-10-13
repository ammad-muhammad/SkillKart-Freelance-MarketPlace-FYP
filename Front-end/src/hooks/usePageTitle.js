import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Public pages already set their own descriptive document.title per-page
// (e.g. JobDetails, Categories) — every authenticated dashboard page shared
// this exact same generic title instead, since neither layout ever touched
// document.title at all. One shared mapping here covers every route under
// a given prefix instead of repeating a title effect in ~14 page files.
const TITLES = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  settings: 'Settings',
  security: 'Security',
  gigs: 'My Gigs',
  'gigs/create': 'Create Gig',
  portfolio: 'Portfolio',
  messages: 'Messages',
  saved: 'Saved',
  proposals: 'My Proposals',
  work: 'My Work',
  wallet: 'Wallet & Earnings',
  'wallet/stripe-callback': 'Wallet',
  'skill-test': 'Skill Test',
  notifications: 'Notifications',
  projects: 'My Projects',
  'projects/create': 'Post New Project',
};

const titleCase = (segment) =>
  segment.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

/**
 * Sets document.title from the current route, relative to `prefix` (e.g.
 * '/freelancer' or '/client'). Falls back to titleCasing the first path
 * segment after the prefix for routes not in TITLES (e.g. a dynamic
 * /client/projects/:jobId/proposals still gets a reasonable "Projects").
 */
export default function usePageTitle(prefix) {
  const location = useLocation();
  useEffect(() => {
    const rest = location.pathname.slice(prefix.length).replace(/^\//, '');
    const label = TITLES[rest] || titleCase(rest.split('/')[0] || '') || 'Dashboard';
    document.title = `${label} – SkillKart`;
  }, [location.pathname, prefix]);
}
