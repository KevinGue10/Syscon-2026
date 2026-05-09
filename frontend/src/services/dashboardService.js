import api from './api';
import { normalizeAuthUser, normalizeBackendRegistration } from '../utils/backendMappers';
import { formatCurrency } from '../utils/currency';

export const dashboardService = {
  async getUserDashboard(session = { user: null, registrations: [] }) {
    try {
      const response = await this.getMyRegistrationDetails();
      const registrations = response.registrations?.length
        ? response.registrations
        : session.registrations || [];
      const profile = response.user
        ? {
            ...session.user,
            ...response.user,
          }
        : session.user;

      return {
        profile,
        registrations,
        metrics: {
          totalRegistrations: registrations.length,
          activePapers: registrations.reduce((sum, item) => sum + (item.papers?.length || 0), 0),
        },
      };
    } catch (error) {
      const registrations = session.registrations || [];

      return {
        profile: session.user,
        registrations,
        metrics: {
          totalRegistrations: registrations.length,
          activePapers: registrations.reduce((sum, item) => sum + (item.papers?.length || 0), 0),
        },
      };
    }
  },

  async getAdminDashboard() {
    const [summaryResponse, recentActivityResponse] = await Promise.all([
      api.get('/admin/dashboard/summary'),
      api.get('/admin/dashboard/recent-activity'),
    ]);

    const summary = summaryResponse.data?.data?.summary || {};
    const recentActivity = recentActivityResponse.data?.data?.recentActivity || [];

    return {
      metrics: [
        { label: 'Inscripciones totales', value: String(summary.totalRegistrations || 0) },
        { label: 'Articulos aceptados', value: String(summary.acceptedPapers || 0) },
        { label: 'Ingresos recaudados', value: formatCurrency(summary.revenueCollected || 0) },
        { label: 'Saldos pendientes', value: formatCurrency(summary.pendingBalances || 0) },
      ],
      recentRegistrations: recentActivity,
    };
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

  async getAdminUsers({ page = 1, pageSize = 10, filters = {} } = {}) {
    const { data } = await api.get('/admin/users', {
      params: {
        page,
        pageSize,
        search: filters.search || undefined,
        country: filters.country || undefined,
        city: filters.city || undefined,
        occupation: filters.occupation || undefined,
        attendanceType: filters.attendanceType || undefined,
        isIeeeMember:
          filters.isIeeeMember === '' || filters.isIeeeMember === undefined
            ? undefined
            : filters.isIeeeMember,
        isTems:
          filters.isTems === '' || filters.isTems === undefined
            ? undefined
            : filters.isTems,
        excludeAdmins: true,
      },
    });

    const users = data.data?.users || [];
    const pagination = data.data?.pagination || null;

    return {
      users: users.filter((user) => user.role !== 'admin'),
      pagination: pagination || {
        page,
        pageSize,
        totalItems: users.filter((user) => user.role !== 'admin').length,
        totalPages: Math.max(1, Math.ceil(users.filter((user) => user.role !== 'admin').length / pageSize)),
      },
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
