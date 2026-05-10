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

  async previewCoupon(payload) {
    const { data } = await api.post('/payments/coupons/preview', payload);
    const response = normalizePaymentResponse(data);
    const preview = data?.data?.couponPreview || data?.data?.preview || null;

    return {
      ...response,
      couponPreview: preview,
      coupon: data?.data?.coupon || preview?.coupon || null,
    };
  },

  async redeemCoupon(payload) {
    const { data } = await api.post('/payments/coupons/redeem', payload);
    const response = normalizePaymentResponse(data);

    return {
      ...response,
      couponRedemption: data?.data?.couponRedemption || data?.data?.redemption || null,
    };
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
