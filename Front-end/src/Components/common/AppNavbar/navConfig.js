import {
  LayoutDashboard, Search, ClipboardList, Wallet, Bot,
  Package, PlusCircle, Briefcase, Bookmark, User, Eye,
  FolderGit2, Bell, Settings, ShieldCheck, LogOut, Users,
  FileCheck, CreditCard, MessageSquare, Inbox
} from 'lucide-react';

/**
 * Role-based navigation links for the AppNavbar.
 * Shared between Freelancer and Client portals.
 */
export const getNavConfig = (role = 'freelancer', user = null) => {
  const userId = user?._id || user?.id || '';

  if (role === 'client') {
    return {
      directLinks: [
        { label: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
        { label: 'Find Talent', href: '/browse-freelancers', icon: Users },
        { label: 'My Jobs & Contracts', href: '/client/projects', icon: Briefcase },
        { label: 'Payments', href: '/client/wallet', icon: CreditCard },
      ],
      dropdowns: [
        {
          id: 'hiring',
          label: 'Hiring',
          items: [
            { label: 'Post a Job', href: '/client/projects/create', icon: PlusCircle, sub: 'Create a new project listing' },
            { label: 'Saved Talent', href: '/client/saved', icon: Bookmark, sub: 'Bookmarked freelancer profiles' },
          ]
        }
      ],
      avatarMenu: [
        { label: 'My Profile', href: '/client/profile', icon: User },
        { label: 'Notifications', href: '/client/notifications', icon: Bell },
        { label: 'Settings', href: '/client/settings', icon: Settings },
        { label: 'Security', href: '/client/security', icon: ShieldCheck },
      ]
    };
  }

  // Default: Freelancer role
  return {
    directLinks: [
      { label: 'Dashboard', href: '/freelancer/dashboard', icon: LayoutDashboard },
      { label: 'Find Work', href: '/browse-projects', icon: Search },
      { label: 'My Proposals', href: '/freelancer/proposals', icon: ClipboardList },
      { label: 'Wallet & Earnings', href: '/freelancer/wallet', icon: Wallet },
    ],
    dropdowns: [
      {
        id: 'work',
        label: 'Work',
        items: [
          { label: 'My Gigs', href: '/freelancer/gigs', icon: Package, sub: 'Manage your active services' },
          { label: 'Create New Gig', href: '/freelancer/gigs/create', icon: PlusCircle, sub: 'Publish a new service package' },
          { label: 'My Work', href: '/freelancer/work', icon: Briefcase, sub: 'Active contracts & orders' },
          { label: 'Saved Projects', href: '/freelancer/saved', icon: Bookmark, sub: 'Bookmarked client postings' },
        ]
      },
      {
        id: 'profile',
        label: 'Profile',
        items: [
          { label: 'My Profile', href: '/freelancer/profile', icon: User, sub: 'Edit skills, bio & rates' },
          { label: 'View Public Profile', href: userId ? `/freelancers/${userId}` : '/freelancer/profile', icon: Eye, sub: 'How clients see you' },
          { label: 'Portfolio', href: '/freelancer/portfolio', icon: FolderGit2, sub: 'Showcase your best projects' },
        ]
      }
    ],
    avatarMenu: [
      { label: 'Notifications', href: '/freelancer/notifications', icon: Bell },
      { label: 'Settings', href: '/freelancer/settings', icon: Settings },
      { label: 'Security', href: '/freelancer/security', icon: ShieldCheck },
    ]
  };
};
