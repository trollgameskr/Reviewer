import { PrismaClient } from '@prisma/client';
import { googlePlayService } from './googlePlayService';
import { aiService } from './aiService';
import { logger } from '../utils/logger';
import { sendTelegramNotification } from './telegramBot';

const prisma = new PrismaClient();

export const startReviewPolling = () => {
  // 5분마다 새 리뷰 확인
  const POLLING_INTERVAL = 5 * 60 * 1000;

  logger.info('리뷰 폴링 시작');

  setInterval(async () => {
    try {
      await fetchAndProcessNewReviews();
    } catch (error) {
      logger.error('리뷰 폴링 중 오류 발생:', error);
    }
  }, POLLING_INTERVAL);

  // 즉시 한 번 실행
  fetchAndProcessNewReviews();
};

async function fetchAndProcessNewReviews() {
  try {
    logger.info('새 리뷰 확인 중...');

    // Google Play에서 리뷰 가져오기
    const reviews = await googlePlayService.getReviews();

    for (const review of reviews) {
      const reviewId = review.reviewId!;
      const comment = review.comments?.[0];

      if (!comment || !comment.userComment) continue;

      // 이미 처리된 리뷰인지 확인
      const existingReview = await prisma.review.findUnique({
        where: { reviewId },
      });

      if (existingReview) continue;

      // 새 리뷰 처리
      await processNewReview(review);
    }

    logger.info('리뷰 확인 완료');
  } catch (error) {
    logger.error('리뷰 가져오기 실패:', error);
  }
}

async function processNewReview(googleReview: any) {
  try {
    const reviewId = googleReview.reviewId!;
    const userComment = googleReview.comments[0].userComment;

    logger.info(`새 리뷰 처리: ${reviewId}`);

    // 언어 감지
    const detectedLanguage = await aiService.detectLanguage(userComment.text);

    // DB에 리뷰 저장
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

    // AI 답변 생성 (한글로)
    const suggestions = await aiService.generateReplyKorean(
      userComment.text,
      userComment.starRating,
      googleReview.authorName || '익명'
    );

    // 답변 제안 저장
    for (const suggestion of suggestions) {
      await prisma.replySuggestion.create({
        data: {
          reviewId: review.id,
          suggestionTextKr: suggestion,
          confidenceScore: 0.8,
        },
      });
    }

    // 텔레그램 알림 전송
    if (process.env.TELEGRAM_BOT_TOKEN) {
      await sendTelegramNotification(review, suggestions);
    }

    logger.info(`리뷰 처리 완료: ${reviewId}, ${suggestions.length}개 답변 생성`);
  } catch (error) {
    logger.error('리뷰 처리 실패:', error);
  }
}
