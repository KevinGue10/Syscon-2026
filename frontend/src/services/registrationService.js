import api from './api';
import { normalizeAuthUser, normalizeBackendRegistration } from '../utils/backendMappers';

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
    return {
      raw: data,
      paper: data.data?.paper || data.paper,
      paymentSummary: data.data?.paymentSummary || data.paymentSummary || null,
    };
  },

  async deletePaper(paperId) {
    const { data } = await api.delete(`/papers/${paperId}`);
    return {
      raw: data,
      registration: normalizeBackendRegistration({
        registration: data.data?.registration || data.registration,
        paymentSummary: data.data?.paymentSummary || data.paymentSummary,
      }),
    };
  },

  async updateRegistration(registrationId, payload) {
    const { data } = await api.put(`/registrations/${registrationId}`, payload);
    return {
      raw: data,
      user: normalizeAuthUser(data.data?.user || null),
      registration: normalizeBackendRegistration({
        registration: data.data?.registration || data.registration,
        paymentSummary: data.data?.paymentSummary || data.paymentSummary,
      }),
    };
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
