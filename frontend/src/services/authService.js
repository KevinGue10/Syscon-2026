import api from './api';

const mockUsers = {
  'attendee@ieee.org': {
    id: 'user-001',
    name: 'Camila Torres',
    email: 'attendee@ieee.org',
    role: 'user',
    organization: 'National University Research Lab',
  },
  'admin@ieee.org': {
    id: 'admin-001',
    name: 'Marcus Chen',
    email: 'admin@ieee.org',
    role: 'admin',
    organization: 'IEEE Coordination Team',
  },
};

export const authService = {
  async login(credentials) {
    void api;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = mockUsers[credentials.email?.toLowerCase()];

        if (!user || !credentials.password || credentials.password.length < 6) {
          reject(new Error('Invalid credentials for mock login.'));
          return;
        }

        resolve({
          token: `mock-token-${user.id}`,
          user,
        });
      }, 700);
    });
  },
};
