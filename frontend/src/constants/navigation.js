export const primaryNavigation = [
  { label: "Home", path: '/' },
  { label: "Register", path: '/register' },
  { label: "Sign in", path: '/login' },
];

export const authenticatedNavigation = [{ label: "Home", path: '/' }];

export const dashboardNavigation = {
  user: [{ label: "Dashboard", path: '/dashboard' }],
  admin: [
    { label: "Administration", path: '/admin' },
    { label: "Change password", path: '/change-password' },
  ],
};
