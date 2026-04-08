import { Router, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';

const router = Router();

// 서비스 계정 키 업로드
router.post('/service-account', authenticate, async (req: any, res: any, next: NextFunction) => {
  try {
    const { keyContent } = req.body;

    if (!keyContent) {
      return res.status(400).json({ error: '서비스 계정 정보가 없습니다.' });
    }
    
    // 파일 경로 설정
    const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let targetPath = envPath ? path.resolve(envPath) : path.resolve(process.cwd(), 'credentials/service-account-key.json');
    
    // 타겟 디렉토리가 없으면 생성
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // JSON 유효성 검증
    try {
      JSON.parse(keyContent);
    } catch (e) {
      return res.status(400).json({ error: '유효한 JSON 형식이 아닙니다.' });
    }

    // 파일 쓰기
    fs.writeFileSync(targetPath, keyContent, 'utf-8');

    res.json({ success: true, message: '서비스 계정 키가 성공적으로 저장되었습니다.' });
  } catch (error) {
    next(error);
  }
});

export default router;
