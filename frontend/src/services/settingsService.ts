import apiClient from '../utils/apiClient';

export const settingsService = {
  uploadServiceAccount: async (keyContent: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/service-account', { keyContent });
    return response.data;
  },
};
