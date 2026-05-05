import api from './api';

export const metadataService = {
  async getCountries() {
    const { data } = await api.get('/metadata/countries');
    return data.countries || [];
  },

  async getActiveEventEditions() {
    const { data } = await api.get('/metadata/event-editions?onlyActive=true');
    return data.eventEditions || [];
  },

  async getCustomFields({ eventEditionId, appliesTo }) {
    const { data } = await api.get('/metadata/custom-fields', {
      params: {
        eventEditionId,
        appliesTo,
      },
    });

    return data.customFields || [];
  },
};
