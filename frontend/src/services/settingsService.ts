import apiClient from '../utils/apiClient';

export interface AIConfig {
  provider: 'openai' | 'azure';
  model?: string;
  endpoint?: string;
  deploymentName?: string;
  apiKey?: string;
}

export interface TelegramConfig {
  botToken?: string;
  botTokenMasked?: string;
  botTokenSet?: boolean;
  chatId: string;
  enabled: boolean;
}

export interface PromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
}

export const settingsService = {
  // 서비스 계정
  uploadServiceAccount: async (keyContent: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/service-account', { keyContent });
    return response.data;
  },

  // AI 모델 설정
  getAiConfig: async (): Promise<AIConfig> => {
    const response = await apiClient.get('/settings/ai');
    return response.data;
  },
  saveAiConfig: async (config: AIConfig): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/ai', config);
    return response.data;
  },

  // 텔레그램 설정
  getTelegramConfig: async (): Promise<TelegramConfig> => {
    const response = await apiClient.get('/settings/telegram');
    return response.data;
  },
  saveTelegramConfig: async (config: Partial<TelegramConfig>): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/telegram', config);
    return response.data;
  },
  testTelegram: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/telegram/test');
    return response.data;
  },

  // AI 프롬프트 설정
  getPromptConfig: async (): Promise<PromptConfig> => {
    const response = await apiClient.get('/settings/prompt');
    return response.data;
  },
  savePromptConfig: async (config: PromptConfig): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/settings/prompt', config);
    return response.data;
  },
};
