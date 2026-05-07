import api from './api';
import { dashboardMetrics, adminTableRows } from '../constants/mockData';
import { normalizeAuthUser, normalizeBackendRegistration } from '../utils/backendMappers';

export const dashboardService = {
  async getUserDashboard(session) {
    void api;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          profile: session.user,
          registrations: session.registrations,
          metrics: {
            totalRegistrations: session.registrations.length,
            activePapers: session.registrations.reduce(
              (sum, item) => sum + (item.papers?.length || 0),
              0,
            ),
          },
        });
      }, 400);
    });
  },

  async getAdminDashboard() {
    void api;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          metrics: dashboardMetrics,
          recentRegistrations: adminTableRows,
        });
      }, 450);
    });
  },

  async getAdminUserRegistrationDetails(userId) {
    const { data } = await api.get(`/admin/users/${userId}/registration-details`);
    return {
      success: data.success,
      message: data.message,
      user: data.data?.user || null,
      registrations: (data.data?.registrations || []).map((registration) =>
        normalizeBackendRegistration({
          registration,
          paymentSummary: registration.paymentSummary,
          papers: registration.papers || [],
        }),
      ),
    };
  },

  async getMyRegistrationDetails() {
    const { data } = await api.get('/registrations/me');
    return {
      success: data.success,
      message: data.message,
      user: normalizeAuthUser(data.data?.user || null),
      registrations: (data.registrations || data.data?.registrations || []).map((registration) =>
        normalizeBackendRegistration({
          registration,
          paymentSummary: registration.paymentSummary,
          papers: registration.papers || [],
        }),
      ),
    };
  },
};
