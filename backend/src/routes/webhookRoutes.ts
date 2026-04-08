import { Router, Request, Response, NextFunction } from 'express';
import { reviewPollerService } from '../services/reviewPoller';
import { logger } from '../utils/logger';

const router = Router();

// API Key 인증 미들웨어
function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.WEBHOOK_API_KEY;

  if (!apiKey) {
    logger.warn('WEBHOOK_API_KEY가 설정되지 않아 webhook이 비활성화됨');
    return res.status(503).json({ error: 'Webhook이 설정되지 않았습니다' });
  }

  const providedKey = req.headers['x-api-key'] as string;

  if (!providedKey || providedKey !== apiKey) {
    logger.warn('Webhook 인증 실패');
    return res.status(401).json({ error: '유효하지 않은 API 키입니다' });
  }

  next();
}

// POST /api/webhook/review-check - 외부에서 즉시 리뷰 체크 트리거
router.post('/review-check', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    logger.info('Webhook으로 리뷰 체크 트리거됨');
    const result = await reviewPollerService.triggerNow();
    res.json({
      success: true,
      message: `리뷰 체크 완료 (새 리뷰: ${result.newReviews}건)`,
      newReviews: result.newReviews,
      status: reviewPollerService.getStatus(),
    });
  } catch (error: any) {
    logger.error('Webhook 리뷰 체크 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
