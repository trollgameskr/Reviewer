import { PrismaClient } from '@prisma/client';
import { googlePlayService } from './googlePlayService';
import { aiService } from './aiService';
import { logger } from '../utils/logger';
import { sendTelegramNotification } from './telegramBot';

const prisma = new PrismaClient();

export interface PollerStatus {
  isRunning: boolean;
  lastPollAt: string | null;
  nextPollAt: string | null;
  intervalMs: number;
  totalProcessed: number;
  lastError: string | null;
  lastPollDurationMs: number | null;
}

export class ReviewPollerService {
  private intervalId: NodeJS.Timeout | null = null;
  private pollingIntervalMs: number;
  private isRunning: boolean = false;
  private isPollingNow: boolean = false;
  private lastPollAt: Date | null = null;
  private totalProcessed: number = 0;
  private lastError: string | null = null;
  private lastPollDurationMs: number | null = null;

  constructor() {
    this.pollingIntervalMs = parseInt(process.env.REVIEW_POLLING_INTERVAL_MS || '300000', 10);
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('리뷰 폴러가 이미 실행 중입니다');
      return;
    }

    this.isRunning = true;
    logger.info(`리뷰 폴링 시작 (간격: ${this.pollingIntervalMs / 1000}초)`);

    // 즉시 한 번 실행
    this.executePoll();

    // 주기적 실행
    this.intervalId = setInterval(() => {
      this.executePoll();
    }, this.pollingIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('리뷰 폴러가 실행 중이 아닙니다');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('리뷰 폴링 중지');
  }

  async triggerNow(): Promise<{ newReviews: number }> {
    if (this.isPollingNow) {
      logger.warn('이미 폴링 진행 중입니다');
      return { newReviews: 0 };
    }
    logger.info('수동 리뷰 폴링 트리거');
    return await this.executePoll();
  }

  setIntervalMs(ms: number): void {
    if (ms < 30000) {
      throw new Error('폴링 간격은 최소 30초 이상이어야 합니다');
    }
    this.pollingIntervalMs = ms;
    logger.info(`폴링 간격 변경: ${ms / 1000}초`);

    // 실행 중이면 재시작
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  getStatus(): PollerStatus {
    let nextPollAt: string | null = null;
    if (this.isRunning && this.lastPollAt) {
      const next = new Date(this.lastPollAt.getTime() + this.pollingIntervalMs);
      nextPollAt = next.toISOString();
    }

    return {
      isRunning: this.isRunning,
      lastPollAt: this.lastPollAt?.toISOString() || null,
      nextPollAt,
      intervalMs: this.pollingIntervalMs,
      totalProcessed: this.totalProcessed,
      lastError: this.lastError,
      lastPollDurationMs: this.lastPollDurationMs,
    };
  }

  private async executePoll(): Promise<{ newReviews: number }> {
    if (this.isPollingNow) {
      return { newReviews: 0 };
    }

    this.isPollingNow = true;
    const startTime = Date.now();
    let newReviewCount = 0;

    try {
      logger.info('새 리뷰 확인 중...');

      const reviews = await googlePlayService.getReviews();

      for (const review of reviews) {
        const reviewId = review.reviewId!;
        const comment = review.comments?.[0];

        if (!comment || !comment.userComment) continue;

        const existingReview = await prisma.review.findUnique({
          where: { reviewId },
        });

        if (existingReview) continue;

        await this.processNewReview(review);
        newReviewCount++;
      }

      this.lastError = null;
      logger.info(`리뷰 확인 완료 (새 리뷰: ${newReviewCount}건)`);
    } catch (error: any) {
      this.lastError = error.message || String(error);
      logger.error('리뷰 폴링 중 오류 발생:', error);
    } finally {
      this.lastPollAt = new Date();
      this.lastPollDurationMs = Date.now() - startTime;
      this.totalProcessed += newReviewCount;
      this.isPollingNow = false;
    }

    return { newReviews: newReviewCount };
  }

  private async processNewReview(googleReview: any): Promise<void> {
    const reviewId = googleReview.reviewId!;
    const userComment = googleReview.comments[0].userComment;

    logger.info(`새 리뷰 처리: ${reviewId}`);

    const detectedLanguage = await aiService.detectLanguage(userComment.text);

    const review = await prisma.review.create({
      data: {
        reviewId,
        appPackageName: googleReview.packageName || '',
        userName: googleReview.authorName || '익명',
        userImage: googleReview.authorImage?.url,
        rating: userComment.starRating || 0,
        text: userComment.text || '',
        language: detectedLanguage,
        originalLanguage: detectedLanguage,
        createdAt: new Date(userComment.lastModified.seconds * 1000),
        status: 'PENDING',
      },
    });

    const suggestions = await aiService.generateReplyKorean(
      userComment.text,
      userComment.starRating,
      googleReview.authorName || '익명'
    );

    for (const suggestion of suggestions) {
      await prisma.replySuggestion.create({
        data: {
          reviewId: review.id,
          suggestionTextKr: suggestion,
          confidenceScore: 0.8,
        },
      });
    }

    if (process.env.TELEGRAM_BOT_TOKEN) {
      await sendTelegramNotification(review, suggestions);
    }

    logger.info(`리뷰 처리 완료: ${reviewId}, ${suggestions.length}개 답변 생성`);
  }
}

// 싱글톤 인스턴스
export const reviewPollerService = new ReviewPollerService();

// 하위호환: 기존 startReviewPolling 함수
export const startReviewPolling = () => {
  reviewPollerService.start();
};
