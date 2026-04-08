import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export class AIService {
  private getClientAndModel(): { client: OpenAI; model: string; fallbackModel: string } {
    const defaultModel = 'gpt-4-turbo-preview';
    const fallbackModel = 'gpt-3.5-turbo';
    const configPath = path.resolve(process.cwd(), 'credentials/ai-config.json');

    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        if (config.provider === 'azure') {
          const client = new OpenAI({
            baseURL: config.endpoint,
            apiKey: config.apiKey,
          });
          return { client, model: config.deploymentName || defaultModel, fallbackModel: config.deploymentName || fallbackModel };
        } else {
          const client = new OpenAI({
            apiKey: config.apiKey || process.env.OPENAI_API_KEY,
          });
          return { client, model: config.model || defaultModel, fallbackModel: config.model || fallbackModel };
        }
      } catch (e) {
        logger.error('Failed to parse ai-config.json, falling back to default', e);
      }
    }

    // Default fallback
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: defaultModel,
      fallbackModel: fallbackModel,
    };
  }

  async generateReplyKorean(
    reviewText: string,
    rating: number,
    userName: string
  ): Promise<string[]> {
    try {
      const knowledgeBase = await prisma.knowledgeBase.findMany({
        where: { enabled: true },
        orderBy: { priority: 'desc' },
      });

      const context = this.buildContext(knowledgeBase);
      const prompt = this.buildPrompt(reviewText, rating, userName, context);
      
      const { client, model } = this.getClientAndModel();

      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `당신은 구글 플레이 스토어 앱 개발자입니다. 사용자 리뷰에 대해 친절하고 전문적인 한글 답변을 작성해야 합니다.
답변은 감사의 표현으로 시작하고, 사용자의 피드백을 인정하며, 필요한 경우 해결 방법이나 향후 개선 계획을 제시해야 합니다.
3가지 다른 스타일의 답변 옵션을 생성하세요: 1) 공식적이고 전문적인 톤, 2) 친근하고 캐주얼한 톤, 3) 간결하고 직접적인 톤`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content || '';
      const suggestions = this.parseMultipleSuggestions(response);

      logger.info(`AI 답변 생성 완료: ${suggestions.length}개 옵션`);
      return suggestions;
    } catch (error) {
      logger.error('AI 답변 생성 실패:', error);
      throw error;
    }
  }

  async translateToOriginalLanguage(
    koreanText: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const { client, model } = this.getClientAndModel();
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `당신은 전문 번역가입니다. 한국어 텍스트를 ${targetLanguage}로 자연스럽게 번역하세요. 원문의 톤과 의미를 정확히 유지해야 합니다.`,
          },
          {
            role: 'user',
            content: koreanText,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0].message.content || koreanText;
    } catch (error) {
      logger.error('번역 실패:', error);
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const { client, fallbackModel } = this.getClientAndModel();
      const completion = await client.chat.completions.create({
        model: fallbackModel,
        messages: [
          {
            role: 'system',
            content: '텍스트의 언어를 감지하고 ISO 639-1 코드로 응답하세요 (예: en, ko, ja, zh). 코드만 응답하세요.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      return completion.choices[0].message.content?.trim() || 'en';
    } catch (error) {
      logger.error('언어 감지 실패:', error);
      return 'en';
    }
  }

  private buildContext(knowledgeBase: any[]): string {
    if (knowledgeBase.length === 0) return '';

    let context = '참고 정보:\n\n';
    knowledgeBase.forEach((kb) => {
      context += `카테고리: ${kb.category}\n`;
      context += `질문 패턴: ${kb.questionPattern}\n`;
      context += `답변 템플릿: ${kb.answerTemplate}\n`;
      context += `키워드: ${kb.keywords?.join(', ')}\n\n`;
    });

    return context;
  }

  private buildPrompt(
    reviewText: string,
    rating: number,
    userName: string,
    context: string
  ): string {
    return `${context}

사용자 정보:
- 이름: ${userName}
- 평점: ${rating}/5

리뷰 내용:
"${reviewText}"

위 리뷰에 대한 답변을 3가지 스타일로 작성해주세요:

[옵션 1: 공식적]
(공식적이고 전문적인 톤의 답변)

[옵션 2: 친근함]
(친근하고 캐주얼한 톤의 답변)

[옵션 3: 간결함]
(간결하고 직접적인 톤의 답변)

각 답변은 2-4문장으로 작성하고, 감사 표현을 포함하며, 사용자의 피드백을 인정해야 합니다.
`;
  }

  private parseMultipleSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    const patterns = [
      /\[옵션 1[:\]]\s*([^\[]+)/i,
      /\[옵션 2[:\]]\s*([^\[]+)/i,
      /\[옵션 3[:\]]\s*([^\[]+)/i,
    ];

    patterns.forEach((pattern) => {
      const match = response.match(pattern);
      if (match && match[1]) {
        suggestions.push(match[1].trim());
      }
    });

    if (suggestions.length === 0) {
      suggestions.push(response.trim());
    }

    return suggestions;
  }
}

export const aiService = new AIService();
