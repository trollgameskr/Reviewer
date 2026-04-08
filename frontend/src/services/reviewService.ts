import apiClient from '../utils/apiClient';

export interface Review {
  id: string;
  reviewId: string;
  appPackageName: string;
  userName: string;
  userImage?: string;
  rating: number;
  text: string;
  language: string;
  createdAt: string;
  status: 'PENDING' | 'ANSWERED' | 'IGNORED';
  suggestions: ReplySuggestion[];
  replies: ReplyHistory[];
}

export interface ReplySuggestion {
  id: string;
  reviewId: string;
  suggestionTextKr: string;
  suggestionTextOriginal?: string;
  confidenceScore?: number;
  selected: boolean;
  createdAt: string;
}

export interface ReplyHistory {
  id: string;
  reviewId: string;
  replyText: string;
  repliedAt: string;
  repliedBy: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewStats {
  pending: number;
  answered: number;
  ignored: number;
  total: number;
}

export const reviewService = {
  getReviews: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ReviewsResponse> => {
    const response = await apiClient.get('/reviews', { params });
    return response.data;
  },

  getReview: async (id: string): Promise<Review> => {
    const response = await apiClient.get(`/reviews/${id}`);
    return response.data;
  },

  replyToReview: async (id: string, data: { suggestionId?: string; customReply?: string }) => {
    const response = await apiClient.post(`/reviews/${id}/reply`, data);
    return response.data;
  },

  ignoreReview: async (id: string) => {
    const response = await apiClient.post(`/reviews/${id}/ignore`);
    return response.data;
  },

  regenerateSuggestions: async (id: string) => {
    const response = await apiClient.post(`/reviews/${id}/regenerate`);
    return response.data;
  },

  getStats: async (): Promise<ReviewStats> => {
    const response = await apiClient.get('/reviews/stats/summary');
    return response.data;
  },
};
