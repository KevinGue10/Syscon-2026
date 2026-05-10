import api from './api';

function normalizePaymentResponse(data) {
  const payload = data?.data || {};

  return {
    success: data?.success ?? true,
    message: data?.message || '',
    payment: payload.payment || null,
    registration: payload.registration || null,
    paymentSummary: payload.paymentSummary || null,
    payments: payload.payments || [],
  };
}

export const paymentService = {
  async getRegistrationPayments(registrationId) {
    const { data } = await api.get(`/payments/registration/${registrationId}`);
    return normalizePaymentResponse(data);
  },

  async createBankTransferPayment(payload) {
    const { data } = await api.post('/payments/bank-transfer', payload);
    return normalizePaymentResponse(data);
  },

  async uploadPaymentProof(paymentId, payload) {
    const { data } = await api.post(`/payments/${paymentId}/proof`, payload);
    return normalizePaymentResponse(data);
  },

  async createPayPalOrder(payload) {
    const { data } = await api.post('/payments/paypal/create-order', payload);
    return normalizePaymentResponse(data);
  },

  async capturePayPalOrder(orderId) {
    const { data } = await api.post('/payments/paypal/capture-order', { orderId });
    return normalizePaymentResponse(data);
  },

  async createPayPhonePayment(payload) {
    const { data } = await api.post('/payments/payphone/create-payment', payload);
    return normalizePaymentResponse(data);
  },
};
