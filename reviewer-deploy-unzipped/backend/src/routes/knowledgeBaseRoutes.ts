import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// 모든 지식베이스 조회
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, enabled } = req.query;

    const where: any = {};
    if (category) where.category = category;
    if (enabled !== undefined) where.enabled = enabled === 'true';

    const knowledgeBase = await prisma.knowledgeBase.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(knowledgeBase);
  } catch (error) {
    next(error);
  }
});

// 특정 지식베이스 조회
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!kb) {
      return res.status(404).json({ error: '지식베이스를 찾을 수 없습니다' });
    }

    res.json(kb);
  } catch (error) {
    next(error);
  }
});

// 지식베이스 생성
router.post(
  '/',
  authenticate,
  [
    body('category').notEmpty().withMessage('카테고리는 필수입니다'),
    body('questionPattern').notEmpty().withMessage('질문 패턴은 필수입니다'),
    body('answerTemplate').notEmpty().withMessage('답변 템플릿은 필수입니다'),
    body('keywords').isArray().withMessage('키워드는 배열이어야 합니다'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { category, questionPattern, answerTemplate, keywords, priority, enabled } = req.body;

      const kb = await prisma.knowledgeBase.create({
        data: {
          category,
          questionPattern,
          answerTemplate,
          keywords,
          priority: priority || 0,
          enabled: enabled !== false,
        },
      });

      res.status(201).json(kb);
    } catch (error) {
      next(error);
    }
  }
);

// 지식베이스 수정
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, questionPattern, answerTemplate, keywords, priority, enabled } = req.body;

    const kb = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(category && { category }),
        ...(questionPattern && { questionPattern }),
        ...(answerTemplate && { answerTemplate }),
        ...(keywords && { keywords }),
        ...(priority !== undefined && { priority }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    res.json(kb);
  } catch (error) {
    next(error);
  }
});

// 지식베이스 삭제
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.knowledgeBase.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 카테고리 목록
router.get('/categories/list', authenticate, async (req, res, next) => {
  try {
    const categories = await prisma.knowledgeBase.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    res.json(categories.map((c) => c.category));
  } catch (error) {
    next(error);
  }
});

export default router;
