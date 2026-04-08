import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { aiService } from './aiService';
import { googlePlayService } from './googlePlayService';

const prisma = new PrismaClient();
let bot: TelegramBot | null = null;

export const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn('텔레그램 봇 토큰이 설정되지 않았습니다');
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on('callback_query', async (callbackQuery) => {
    try {
      const msg = callbackQuery.message;
      const data = callbackQuery.data;

      if (!msg || !data) return;

      await handleCallbackQuery(callbackQuery);
    } catch (error) {
      logger.error('텔레그램 콜백 처리 실패:', error);
    }
  });

  logger.info('텔레그램 봇 초기화 완료');
};

export const sendTelegramNotification = async (
  review: any,
  suggestions: string[]
) => {
  if (!bot || !process.env.TELEGRAM_CHAT_ID) return;

  try {
    const message = `
🆕 새로운 리뷰가 등록되었습니다!

👤 사용자: ${review.userName}
⭐ 평점: ${review.rating}/5
🌍 언어: ${review.language}

📝 리뷰 내용:
"${review.text}"

💬 AI 생성 답변 옵션:
${suggestions.map((s, i) => `\n${i + 1}. ${s}`).join('\n')}
`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '옵션 1 선택', callback_data: `select_${review.id}_0` },
          { text: '옵션 2 선택', callback_data: `select_${review.id}_1` },
          { text: '옵션 3 선택', callback_data: `select_${review.id}_2` },
        ],
        [{ text: '무시하기', callback_data: `ignore_${review.id}` }],
        [{ text: '웹에서 보기', url: `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/reviews/${review.id}` }],
      ],
    };

    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
      reply_markup: keyboard,
    });

    logger.info(`텔레그램 알림 전송: ${review.id}`);
  } catch (error) {
    logger.error('텔레그램 알림 전송 실패:', error);
  }
};

async function handleCallbackQuery(callbackQuery: any) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  if (data.startsWith('select_')) {
    // 답변 선택
    const [, reviewId, suggestionIndex] = data.split('_');
    await selectAndReply(reviewId, parseInt(suggestionIndex), chatId);
  } else if (data.startsWith('ignore_')) {
    // 리뷰 무시
    const reviewId = data.replace('ignore_', '');
    await ignoreReview(reviewId, chatId);
  }
}

async function selectAndReply(
  reviewId: string,
  suggestionIndex: number,
  chatId: number
) {
  try {
    // 리뷰 및 제안 가져오기
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { suggestions: true },
    });

    if (!review || !review.suggestions[suggestionIndex]) {
      await bot?.sendMessage(chatId, '❌ 리뷰 또는 답변을 찾을 수 없습니다.');
      return;
    }

    const selectedSuggestion = review.suggestions[suggestionIndex];

    // 원본 언어로 번역
    const translatedReply = await aiService.translateToOriginalLanguage(
      selectedSuggestion.suggestionTextKr,
      review.originalLanguage || review.language
    );

    // Google Play에 답변 게시
    await googlePlayService.replyToReview(review.reviewId, translatedReply);

    // DB 업데이트
    await prisma.replySuggestion.update({
      where: { id: selectedSuggestion.id },
      data: { selected: true },
    });

    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'ANSWERED' },
    });

    await prisma.replyHistory.create({
      data: {
        reviewId,
        replyText: translatedReply,
        repliedBy: 'telegram',
      },
    });

    await bot?.sendMessage(
      chatId,
      `✅ 답변이 성공적으로 게시되었습니다!\n\n답변 내용:\n"${translatedReply}"`
    );

    logger.info(`리뷰 답변 완료 (텔레그램): ${reviewId}`);
  } catch (error) {
    logger.error('리뷰 답변 실패:', error);
    await bot?.sendMessage(chatId, '❌ 답변 게시에 실패했습니다.');
  }
}

async function ignoreReview(reviewId: string, chatId: number) {
  try {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'IGNORED' },
    });

    await bot?.sendMessage(chatId, '✅ 리뷰를 무시했습니다.');
    logger.info(`리뷰 무시: ${reviewId}`);
  } catch (error) {
    logger.error('리뷰 무시 실패:', error);
    await bot?.sendMessage(chatId, '❌ 작업에 실패했습니다.');
  }
}
