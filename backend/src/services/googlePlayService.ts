import { google } from 'googleapis';
import { logger } from '../utils/logger';

const androidpublisher = google.androidpublisher('v3');

export class GooglePlayService {
  private auth: any;
  private packageName: string;

  constructor() {
    this.packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || '';
    this.initAuth();
  }

  private async initAuth() {
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    } catch (error) {
      logger.error('Google Play 인증 초기화 실패:', error);
    }
  }

  async getReviews(maxResults: number = 100) {
    try {
      const authClient = await this.auth.getClient();
      const response = await androidpublisher.reviews.list({
        auth: authClient,
        packageName: this.packageName,
        maxResults,
      });

      return response.data.reviews || [];
    } catch (error) {
      logger.error('리뷰 조회 실패:', error);
      throw error;
    }
  }

  async replyToReview(reviewId: string, replyText: string) {
    try {
      const authClient = await this.auth.getClient();
      await androidpublisher.reviews.reply({
        auth: authClient,
        packageName: this.packageName,
        reviewId,
        requestBody: {
          replyText,
        },
      });

      logger.info(`리뷰 답변 완료: ${reviewId}`);
      return true;
    } catch (error) {
      logger.error('리뷰 답변 실패:', error);
      throw error;
    }
  }
}

export const googlePlayService = new GooglePlayService();
