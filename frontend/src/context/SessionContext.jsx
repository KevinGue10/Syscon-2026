import { createContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const SessionContext = createContext(null);

const initialSession = {
  ownerUserId: null,
  user: {
    affiliation: 'Future Mobility Lab',
    country: 'Colombia',
  },
  registrations: [],
};

export function SessionProvider({ children }) {
  const [session, setSession] = useLocalStorage('ieee-session', initialSession);

  useEffect(() => {
    const authState = JSON.parse(localStorage.getItem('ieee-auth') || 'null');
    const authenticatedUserId = authState?.isAuthenticated ? authState?.user?.id || null : null;

    if (!authenticatedUserId) {
      if (session.ownerUserId !== null || session.registrations.length) {
        setSession(initialSession);
      }
      return;
    }

    if (session.ownerUserId !== null && String(session.ownerUserId) !== String(authenticatedUserId)) {
      setSession({
        ...initialSession,
        ownerUserId: authenticatedUserId,
      });
      return;
    }

    if (session.ownerUserId === null) {
      setSession((current) => ({
        ...current,
        ownerUserId: authenticatedUserId,
      }));
    }
  }, [session.ownerUserId, session.registrations.length, setSession]);

  const setUserProfile = (user) => {
    const authState = JSON.parse(localStorage.getItem('ieee-auth') || 'null');
    const authenticatedUserId = authState?.isAuthenticated ? authState?.user?.id || user?.id || null : null;

    setSession((current) => ({
      ...current,
      ownerUserId: authenticatedUserId,
      user: {
        ...current.user,
        ...user,
      },
    }));
  };

  const addRegistration = (registration) => {
    setSession((current) => ({
      ...current,
      registrations: [registration, ...current.registrations],
    }));
  };

  const setRegistrations = (registrations) => {
    setSession((current) => ({
      ...current,
      registrations,
    }));
  };

  const clearSession = () => {
    setSession(initialSession);
  };

  const value = useMemo(
    () => ({
      session,
      setUserProfile,
      addRegistration,
      setRegistrations,
      clearSession,
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
