import apiClient from '../utils/apiClient';

export interface KnowledgeBase {
  id: string;
  category: string;
  questionPattern: string;
  answerTemplate: string;
  keywords: string[];
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const knowledgeBaseService = {
  getAll: async (params?: { category?: string; enabled?: boolean }): Promise<KnowledgeBase[]> => {
    const response = await apiClient.get('/knowledge-base', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<KnowledgeBase> => {
    const response = await apiClient.get(`/knowledge-base/${id}`);
    return response.data;
  },

  create: async (data: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeBase> => {
    const response = await apiClient.post('/knowledge-base', data);
    return response.data;
  },

  update: async (id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> => {
    const response = await apiClient.put(`/knowledge-base/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/knowledge-base/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get('/knowledge-base/categories/list');
    return response.data;
  },
};
