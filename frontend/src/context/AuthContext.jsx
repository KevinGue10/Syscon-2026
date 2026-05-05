import { createContext, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';

export const AuthContext = createContext(null);

const INITIAL_AUTH = storage.get('ieee-auth', {
  user: null,
  token: null,
  isAuthenticated: false,
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(INITIAL_AUTH);

  const setAuthenticatedState = (response) => {
    const nextState = {
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    };

    storage.set('ieee-auth', nextState);
    localStorage.setItem('ieee-auth-token', response.token);
    setAuthState(nextState);
  };

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    setAuthenticatedState(response);
    return response.user;
  };

  const register = async (payload) => {
    const response = await authService.register(payload);
    setAuthenticatedState(response);
    return response.user;
  };

  const logout = () => {
    storage.remove('ieee-auth');
    localStorage.removeItem('ieee-auth-token');
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  };

  const value = useMemo(
    () => ({
      ...authState,
      login,
      register,
      logout,
    }),
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
