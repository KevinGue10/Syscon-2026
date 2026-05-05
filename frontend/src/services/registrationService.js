import api from './api';
import { normalizeBackendRegistration } from '../utils/backendMappers';

export const registrationService = {
  async createRegistration(payload) {
    const { data } = await api.post('/registrations', payload);

    return {
      raw: data,
      registration: normalizeBackendRegistration({
        registration: data.registration,
        paymentSummary: data.paymentSummary,
      }),
    };
  },

  async addPaper(registrationId, payload) {
    const { data } = await api.post(`/registrations/${registrationId}/papers`, payload);
    return data;
  },

  async getPaymentSummary(registrationId) {
    const { data } = await api.get(`/registrations/${registrationId}/payment-summary`);
    return {
      raw: data,
      registration: normalizeBackendRegistration({
        registration: data.registration,
        paymentSummary: data.paymentSummary,
      }),
    };
  },
};
