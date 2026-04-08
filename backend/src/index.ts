import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import reviewRoutes from './routes/reviewRoutes';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes';
import authRoutes from './routes/authRoutes';
import settingsRoutes from './routes/settingsRoutes';
import webhookRoutes from './routes/webhookRoutes';
import { startReviewPolling } from './services/reviewPoller';
import { initTelegramBot } from './services/telegramBot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로깅
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhook', webhookRoutes);

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);

  // 리뷰 폴링 시작
  startReviewPolling();

  // 텔레그램 봇 초기화 (설정 파일 또는 .env)
  const telegramConfigPath = path.resolve(process.cwd(), 'credentials/telegram-config.json');
  const hasTelegramConfig = fs.existsSync(telegramConfigPath);
  if (process.env.TELEGRAM_BOT_TOKEN || hasTelegramConfig) {
    initTelegramBot();
  }
});

export default app;
