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
    reusedExistingPayment:
      payload.reusedExistingPayment ?? data?.reusedExistingPayment ?? false,
  };
}

export const paymentService = {
  async createCobruPayment(payload) {
    const { data } = await api.post('/payments/cobru/create-payment', payload);
    return normalizePaymentResponse(data);
  },
  async refreshCobruPayment(paymentId) {
    const { data } = await api.post('/payments/cobru/'+paymentId+'/refresh');
    return normalizePaymentResponse(data);
  },
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

  async approvePayment(paymentId, payload = {}) {
    const { data } = await api.patch(`/payments/${paymentId}/approve`, payload);
    return normalizePaymentResponse(data);
  },

  async rejectPayment(paymentId, payload) {
    const { data } = await api.patch(`/payments/${paymentId}/reject`, payload);
    return normalizePaymentResponse(data);
  },

  async cancelPayment(paymentId) {
    const { data } = await api.patch(`/payments/${paymentId}/cancel`);
    return normalizePaymentResponse(data);
  },

  async sendPayPhoneLink(paymentId, payload) {
    const { data } = await api.patch(`/payments/${paymentId}/send-link`, payload);
    return normalizePaymentResponse(data);
  },

  async getPaymentProofAccess(paymentId) {
    const { data } = await api.get(`/payments/${paymentId}/proof-access`, {
      params: {
        paymentId,
      },
    });

    return {
      success: data?.success ?? true,
      message: data?.message || '',
      proofAccess: data?.data || null,
    };
  },

  async uploadPaymentProof(paymentId, payload) {
    const { data } = await api.post(`/payments/${paymentId}/proof`, payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
