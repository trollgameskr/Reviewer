import { Router, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';

const router = Router();

function getAiConfigPath() {
  return path.resolve(process.cwd(), 'credentials/ai-config.json');
}

function getTelegramConfigPath() {
  return path.resolve(process.cwd(), 'credentials/telegram-config.json');
}

function getPromptConfigPath() {
  return path.resolve(process.cwd(), 'credentials/prompt-config.json');
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── AI 설정 ────────────────────────────────────────────────
router.get('/ai', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const aiConfigPath = getAiConfigPath();
    if (fs.existsSync(aiConfigPath)) {
      const content = fs.readFileSync(aiConfigPath, 'utf-8');
      const config = JSON.parse(content);
      res.json(config);
    } else {
      res.json({ provider: 'openai', model: 'gpt-4-turbo-preview' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/ai', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const config = req.body;
    const aiConfigPath = getAiConfigPath();
    ensureDir(aiConfigPath);
    fs.writeFileSync(aiConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, message: 'AI 설정이 성공적으로 저장되었습니다.' });
  } catch (error) {
    next(error);
  }
});

// ─── 서비스 계정 키 업로드 ───────────────────────────────────
router.post('/service-account', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const { keyContent } = req.body;

    if (!keyContent) {
      return res.status(400).json({ error: '서비스 계정 정보가 없습니다.' });
    }
    
    const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let targetPath = envPath ? path.resolve(envPath) : path.resolve(process.cwd(), 'credentials/service-account-key.json');
    
    ensureDir(targetPath);

    try {
      JSON.parse(keyContent);
    } catch (e) {
      return res.status(400).json({ error: '유효한 JSON 형식이 아닙니다.' });
    }

    fs.writeFileSync(targetPath, keyContent, 'utf-8');
    res.json({ success: true, message: '서비스 계정 키가 성공적으로 저장되었습니다.' });
  } catch (error) {
    next(error);
  }
});

// ─── 텔레그램 설정 ──────────────────────────────────────────
router.get('/telegram', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const configPath = getTelegramConfigPath();
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      // API 키는 마스킹해서 전송
      if (config.botToken) {
        const token = config.botToken;
        config.botTokenMasked = token.length > 8
          ? token.substring(0, 4) + '****' + token.substring(token.length - 4)
          : '****';
        config.botTokenSet = true;
      } else {
        config.botTokenSet = false;
      }
      res.json(config);
    } else {
      // .env에서 기존 값 확인
      res.json({
        botTokenSet: !!process.env.TELEGRAM_BOT_TOKEN,
        botTokenMasked: process.env.TELEGRAM_BOT_TOKEN
          ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 4) + '****'
          : '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
        enabled: !!process.env.TELEGRAM_BOT_TOKEN,
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/telegram', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const { botToken, chatId, enabled } = req.body;
    const configPath = getTelegramConfigPath();
    ensureDir(configPath);

    // 기존 설정 로드 (botToken이 빈 문자열이면 기존 값 유지)
    let existing: any = {};
    if (fs.existsSync(configPath)) {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    const newConfig = {
      botToken: botToken || existing.botToken || '',
      chatId: chatId ?? existing.chatId ?? '',
      enabled: enabled ?? existing.enabled ?? true,
    };

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
    res.json({ success: true, message: '텔레그램 설정이 성공적으로 저장되었습니다.' });
  } catch (error) {
    next(error);
  }
});

// 텔레그램 연결 테스트
router.post('/telegram/test', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const configPath = getTelegramConfigPath();
    let token = '';
    let chatId = '';

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      token = config.botToken;
      chatId = config.chatId;
    } else {
      token = process.env.TELEGRAM_BOT_TOKEN || '';
      chatId = process.env.TELEGRAM_CHAT_ID || '';
    }

    if (!token || !chatId) {
      return res.status(400).json({ success: false, message: '텔레그램 봇 토큰 또는 채팅 ID가 설정되지 않았습니다.' });
    }

    // 간단한 테스트 메시지 전송
    const TelegramBotLib = (await import('node-telegram-bot-api')).default;
    const testBot = new TelegramBotLib(token);
    await testBot.sendMessage(chatId, '✅ Reviewer 시스템 연결 테스트 성공!');

    res.json({ success: true, message: '테스트 메시지가 성공적으로 전송되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `텔레그램 테스트 실패: ${error.message}` });
  }
});

// ─── AI 프롬프트 설정 ───────────────────────────────────────
router.get('/prompt', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const configPath = getPromptConfigPath();
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      res.json(config);
    } else {
      // 기본 프롬프트
      res.json({
        systemPrompt: `당신은 구글 플레이 스토어 앱 개발자입니다. 사용자 리뷰에 대해 친절하고 전문적인 한글 답변을 작성해야 합니다.
답변은 감사의 표현으로 시작하고, 사용자의 피드백을 인정하며, 필요한 경우 해결 방법이나 향후 개선 계획을 제시해야 합니다.
3가지 다른 스타일의 답변 옵션을 생성하세요: 1) 공식적이고 전문적인 톤, 2) 친근하고 캐주얼한 톤, 3) 간결하고 직접적인 톤`,
        userPromptTemplate: `{context}

사용자 정보:
- 이름: {userName}
- 평점: {rating}/5

리뷰 내용:
"{reviewText}"

위 리뷰에 대한 답변을 3가지 스타일로 작성해주세요:

[옵션 1: 공식적]
(공식적이고 전문적인 톤의 답변)

[옵션 2: 친근함]
(친근하고 캐주얼한 톤의 답변)

[옵션 3: 간결함]
(간결하고 직접적인 톤의 답변)

각 답변은 2-4문장으로 작성하고, 감사 표현을 포함하며, 사용자의 피드백을 인정해야 합니다.`,
        temperature: 0.8,
        maxTokens: 1000,
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/prompt', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const config = req.body;
    const configPath = getPromptConfigPath();
    ensureDir(configPath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, message: 'AI 프롬프트 설정이 성공적으로 저장되었습니다.' });
  } catch (error) {
    next(error);
  }
});

export default router;
