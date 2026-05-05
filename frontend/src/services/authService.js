import api from './api';
import { normalizeAuthUser } from '../utils/backendMappers';

export const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    return {
      token: data.token,
      user: normalizeAuthUser(data.user),
      message: data.message,
    };
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return {
      token: data.token,
      user: normalizeAuthUser(data.user),
      message: data.message,
    };
  },

  async getCurrentUser() {
    const { data } = await api.get('/auth/me');
    return normalizeAuthUser(data.user);
  },
};
