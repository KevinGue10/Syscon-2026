import { Link, NavLink } from 'react-router-dom';
import {
  authenticatedNavigation,
  primaryNavigation,
  dashboardNavigation,
} from '../constants/navigation';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
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
      <div className="container-shell flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00334d] text-sm font-bold text-white">
            IEEE
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-brand-900">
              SYSCON LATAM 2026
            </p>
            <p className="text-xs text-slate-500">Cartagena · 3–4 diciembre 2026</p>
          </div>
        </Link>

        <nav className="order-3 flex w-full flex-wrap items-center gap-x-6 gap-y-3 border-t border-brand-100 pt-3 md:order-none md:w-auto md:border-0 md:pt-0">
          {navigationItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
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
              className="hidden rounded-2xl bg-[#c83e00] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a93200] sm:inline-flex"
            >
              Regístrate ahora
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
