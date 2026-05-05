import { createContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const SessionContext = createContext(null);

const initialSession = {
  user: {
    affiliation: 'Future Mobility Lab',
    country: 'Colombia',
  },
  registrations: [],
};

export function SessionProvider({ children }) {
  const [session, setSession] = useLocalStorage('ieee-session', initialSession);

  const setUserProfile = (user) => {
    setSession((current) => ({
      ...current,
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
