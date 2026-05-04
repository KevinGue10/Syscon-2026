import api from './api';
import { dashboardMetrics, adminTableRows } from '../constants/mockData';

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
};
