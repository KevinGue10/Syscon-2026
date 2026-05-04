import api from './api';
import { calculatePricing } from '../utils/pricing';

export const registrationService = {
  async submitRegistration(payload) {
    void api;

    return new Promise((resolve) => {
      setTimeout(() => {
        const pricing = calculatePricing(payload);
        resolve({
          id: `REG-${Math.floor(Math.random() * 9000) + 1000}`,
          ...payload,
          pricing,
          paymentStatus: pricing.balance > 0 ? 'Partial' : 'Paid',
          createdAt: new Date().toISOString(),
        });
      }, 800);
    });
  },
};
