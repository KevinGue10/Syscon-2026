import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  authenticatedNavigation,
  primaryNavigation,
  dashboardNavigation,
} from '../constants/navigation';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';

export function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const hideAuthActionsOnLanding = isAuthenticated && location.pathname === '/';
  const protectedNav = isAuthenticated ? dashboardNavigation[user?.role || 'user'] || [] : [];
  const navigationItems = isAuthenticated
    ? [...authenticatedNavigation, ...protectedNav]
    : primaryNavigation;

  const linkClass = ({ isActive }) =>
    `text-sm font-semibold transition ${
      isActive ? 'text-brand-600' : 'text-slate-600 hover:text-slate-950'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur">
      <div className="container-shell flex min-h-20 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
            IEEE
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-slate-950">
              Plataforma de Conferencia
            </p>
            <p className="text-xs text-slate-500">Portal de registro y participantes</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navigationItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && !hideAuthActionsOnLanding ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-950">{user?.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{user?.role}</p>
              </div>
              <Button variant="ghost" onClick={logout} className="border border-slate-200">
                Cerrar sesion
              </Button>
            </>
          ) : !isAuthenticated ? (
            <Link
              to="/register"
              className="hidden rounded-2xl bg-accent-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-300 sm:inline-flex"
            >
              Registrate ahora
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
