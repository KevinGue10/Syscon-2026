import api from './api';
import { normalizeAuthUser } from '../utils/backendMappers';

export const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    const payload = data?.data || {};

    return {
      token: payload.token,
      user: normalizeAuthUser(payload.user),
      message: data.message,
    };
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    const responsePayload = data?.data || {};

    return {
      token: responsePayload.token,
      user: normalizeAuthUser(responsePayload.user),
      message: data.message,
    };
  },

  async getCurrentUser() {
    const { data } = await api.get('/auth/me');
    return normalizeAuthUser(data.user);
  },

  async changePassword(payload) {
    const { data } = await api.post('/auth/change-password', payload);
    return {
      success: data?.success ?? true,
      message: data?.message || 'Contrasena actualizada correctamente.',
      data: data?.data || {},
    };
  },

  async forgotPassword(payload) {
    const { data } = await api.post('/auth/forgot-password', payload);
    return {
      success: data?.success ?? true,
      message: data?.message || 'Si el correo existe, se enviara una contrasena provisional.',
      data: data?.data || {},
    };
  },
};
