import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { aiService } from '../services/aiService';
import { googlePlayService } from '../services/googlePlayService';
import { reviewPollerService } from '../services/reviewPoller';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// 모든 리뷰 조회
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where = status ? { status: status as any } : {};

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          suggestions: true,
          replies: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 특정 리뷰 조회
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        suggestions: true,
        replies: true,
      },
    });

    if (!review) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다' });
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
});

// 답변 선택 및 게시
router.post('/:id/reply', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { suggestionId, customReply } = req.body;

    const review = await prisma.review.findUnique({
      where: { id },
      include: { suggestions: true },
    });

    if (!review) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다' });
    }

    let replyTextKr: string;

    if (customReply) {
      // 커스텀 답변 사용
      replyTextKr = customReply;
    } else if (suggestionId) {
      // 제안된 답변 선택
      const suggestion = review.suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) {
        return res.status(404).json({ error: '제안을 찾을 수 없습니다' });
      }
      replyTextKr = suggestion.suggestionTextKr;

      // 선택된 제안 표시
      await prisma.replySuggestion.update({
        where: { id: suggestionId },
        data: { selected: true },
      });
    } else {
      return res.status(400).json({ error: '답변을 선택하거나 입력해주세요' });
    }

    // 원본 언어로 번역
    const translatedReply = await aiService.translateToOriginalLanguage(
      replyTextKr,
      review.originalLanguage || review.language
    );

    // Google Play에 답변 게시
    await googlePlayService.replyToReview(review.reviewId, translatedReply);

    // DB 업데이트
    await prisma.review.update({
      where: { id },
      data: { status: 'ANSWERED' },
    });

    await prisma.replyHistory.create({
      data: {
        reviewId: id,
        replyText: translatedReply,
        repliedBy: 'web',
      },
    });

    logger.info(`리뷰 답변 완료 (웹): ${id}`);

    res.json({
      success: true,
      replyText: translatedReply,
    });
  } catch (error) {
    next(error);
  }
});

// 리뷰 무시
router.post('/:id/ignore', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.review.update({
      where: { id },
      data: { status: 'IGNORED' },
    });

    logger.info(`리뷰 무시: ${id}`);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 답변 재생성
router.post('/:id/regenerate', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다' });
    }

    // 기존 제안 삭제
    await prisma.replySuggestion.deleteMany({
      where: { reviewId: id },
    });

    // 새 답변 생성
    const suggestions = await aiService.generateReplyKorean(
      review.text,
      review.rating,
      review.userName
    );

    // 새 제안 저장
    const newSuggestions = await Promise.all(
      suggestions.map((suggestion) =>
        prisma.replySuggestion.create({
          data: {
            reviewId: id,
            suggestionTextKr: suggestion,
            confidenceScore: 0.8,
          },
        })
      )
    );

    logger.info(`답변 재생성 완료: ${id}`);

    res.json({ suggestions: newSuggestions });
  } catch (error) {
    next(error);
  }
});

// 통계
router.get('/stats/summary', authenticate, async (req, res, next) => {
  try {
    const [pending, answered, ignored, total] = await Promise.all([
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { status: 'ANSWERED' } }),
      prisma.review.count({ where: { status: 'IGNORED' } }),
      prisma.review.count(),
    ]);

    res.json({
      pending,
      answered,
      ignored,
      total,
    });
  } catch (error) {
    next(error);
  }
});

// ─── 폴러 제어 ────────────────────────────────────────────────

// 폴러 상태 조회
router.get('/poller/status', authenticate, async (req, res, next) => {
  try {
    res.json(reviewPollerService.getStatus());
  } catch (error) {
    next(error);
  }
});

// 수동 리뷰 체크 트리거
router.post('/poller/trigger', authenticate, async (req, res, next) => {
  try {
    const result = await reviewPollerService.triggerNow();
    res.json({
      success: true,
      newReviews: result.newReviews,
      status: reviewPollerService.getStatus(),
    });
  } catch (error) {
    next(error);
  }
});

// 폴링 간격 변경
router.post('/poller/config', authenticate, async (req, res, next) => {
  try {
    const { intervalMs } = req.body;

    if (!intervalMs || typeof intervalMs !== 'number') {
      return res.status(400).json({ error: 'intervalMs(숫자)를 입력해주세요' });
    }

    reviewPollerService.setIntervalMs(intervalMs);
    res.json({
      success: true,
      message: `폴링 간격이 ${intervalMs / 1000}초로 변경되었습니다`,
      status: reviewPollerService.getStatus(),
    });
  } catch (error: any) {
    if (error.message?.includes('최소')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
