import apiClient from '../utils/apiClient';

export interface AIConfig {
  provider: 'openai' | 'azure';
  model?: string;
  endpoint?: string;
  deploymentName?: string;
  apiKey?: string;
}

export const settingsService = {
  uploadServiceAccount: async (keyContent: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/service-account', { keyContent });
    return response.data;
  },
  getAiConfig: async (): Promise<AIConfig> => {
    const response = await apiClient.get('/settings/ai');
    return response.data;
  },
  saveAiConfig: async (config: AIConfig): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/ai', config);
    return response.data;
  }
};
