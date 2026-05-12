import axios from 'axios';

const PUBLIC_AUTH_PATHS = new Set(['/auth/login', '/auth/register']);
const SESSION_EXPIRED_REDIRECT = '/login?reason=session-expired';

function shouldAttachToken(config) {
  const requestPath = config?.url || '';
  return !PUBLIC_AUTH_PATHS.has(requestPath);
}

function clearClientSession() {
  localStorage.removeItem('ieee-auth');
  localStorage.removeItem('ieee-auth-token');
  localStorage.removeItem('ieee-session');
}

function shouldForceLogout(error) {
  const status = error?.response?.status;
  const requestPath = error?.config?.url || '';
  const hadAuthorizationHeader = Boolean(error?.config?.headers?.Authorization);
  const backendMessage = String(
    error?.response?.data?.message || error?.response?.data?.error || error?.message || '',
  ).toLowerCase();

  if (PUBLIC_AUTH_PATHS.has(requestPath)) {
    return false;
  }

  if (!hadAuthorizationHeader) {
    return false;
  }

  if (status === 401) {
    return true;
  }

  return (
    status === 403 &&
    ['token', 'expired', 'inval', 'unauthorized', 'unauthenticated', 'jwt'].some((keyword) =>
      backendMessage.includes(keyword),
    )
  );
}

function redirectToExpiredSessionLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === '/login') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') !== 'session-expired') {
      params.set('reason', 'session-expired');
      window.history.replaceState({}, '', `/login?${params.toString()}`);
    }
    return;
  }

  window.location.replace(SESSION_EXPIRED_REDIRECT);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ieee-auth-token');

  if (token && shouldAttachToken(config)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldForceLogout(error)) {
      clearClientSession();
      redirectToExpiredSessionLogin();
    }

    return Promise.reject(error);
  },
);

export default api;
