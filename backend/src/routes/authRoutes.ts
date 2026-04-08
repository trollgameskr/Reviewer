import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// 로그인
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('사용자명은 필수입니다'),
    body('password').notEmpty().withMessage('비밀번호는 필수입니다'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return res.status(401).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다' });
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 사용자 등록 (첫 사용자만 또는 관리자만)
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('사용자명은 필수입니다'),
    body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // 이미 존재하는 사용자 확인
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({ error: '이미 존재하는 사용자명입니다' });
      }

      // 비밀번호 해시
      const hashedPassword = await bcrypt.hash(password, 10);

      // 사용자 생성
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
