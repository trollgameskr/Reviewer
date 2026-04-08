# Reviewer - AI 기반 구글 플레이 리뷰 자동 답변 시스템

구글 플레이 콘솔 API를 활용하여 앱 리뷰에 대한 AI 기반 자동 답변을 생성하고 관리하는 시스템입니다.

## 주요 기능

- 🤖 **AI 자동 답변 생성**: OpenAI GPT를 활용하여 리뷰에 대한 적절한 답변을 3가지 스타일로 생성
- 🌐 **다국어 지원**: 리뷰 언어 자동 감지 및 답변 번역
- 📱 **웹 인터페이스**: 리뷰 확인 및 답변 선택/수정 가능
- 📲 **텔레그램 봇** (선택): 새 리뷰 알림 및 빠른 답변 선택
- 📚 **지식베이스 관리**: AI 답변 품질 향상을 위한 템플릿 및 키워드 관리
- 🔄 **자동 폴링**: 5분마다 새 리뷰 자동 확인
- 🐳 **Docker 지원**: 시놀로지 NAS 포함 모든 Docker 환경에서 실행 가능

## 시스템 아키텍처

```
┌─────────────────┐
│  Google Play    │
│  Console API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Backend API    │◄────►│  PostgreSQL  │
│  (Node.js)      │      │  Database    │
└────────┬────────┘      └──────────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────────┐  ┌──────────────┐
│  Frontend Web   │  │  Telegram    │
│  (React)        │  │  Bot         │
└─────────────────┘  └──────────────┘
         │
         ▼
┌─────────────────┐
│  AI Service     │
│  (OpenAI GPT)   │
└─────────────────┘
```

## 시작하기

### 사전 요구사항

- Docker & Docker Compose
- Google Cloud 프로젝트 및 서비스 계정
- OpenAI API 키
- (선택) 텔레그램 봇 토큰

### 1. Google Cloud 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. Google Play Android Developer API 활성화
3. 서비스 계정 생성 및 JSON 키 다운로드
4. Google Play Console에서 서비스 계정에 권한 부여

### 2. 환경 설정

```bash
# 저장소 클론
git clone https://github.com/trollgameskr/Reviewer.git
cd Reviewer

# 환경 변수 파일 생성
cp .env.example .env

# .env 파일 수정
nano .env
```

`.env` 파일 설정:

```env
# Database
DATABASE_URL=postgresql://reviewer:reviewer_password@postgres:5432/reviewer_db

# Server
PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-key-change-this

# Google Play Console
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json
GOOGLE_PLAY_PACKAGE_NAME=com.yourapp.package

# AI Service
OPENAI_API_KEY=sk-your-openai-api-key

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
```

### 3. Google 서비스 계정 키 배치

```bash
mkdir -p backend/credentials
cp /path/to/your/service-account-key.json backend/credentials/
```

### 4. Docker로 실행

```bash
# 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 5. 초기 사용자 생성

```bash
# API 엔드포인트 호출
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

### 6. 웹 인터페이스 접속

브라우저에서 `http://localhost` 접속하여 로그인

## 시놀로지 NAS 배포

### 1. Docker 패키지 설치

시놀로지 패키지 센터에서 Docker 설치

### 2. 파일 업로드

File Station을 통해 프로젝트 파일을 `/docker/reviewer`에 업로드

### 3. Docker Compose 실행

```bash
# SSH 접속
ssh admin@your-nas-ip

# 프로젝트 디렉토리로 이동
cd /volume1/docker/reviewer

# 실행
sudo docker-compose up -d
```

### 4. 포트 포워딩 설정

- 제어판 > 외부 액세스 > 라우터 구성
- 포트 80 (웹) 및 3000 (API) 포워딩 설정

### 5. HTTPS 설정 (권장)

- 제어판 > 보안 > 인증서
- Let's Encrypt 인증서 발급
- 리버스 프록시 설정

## 텔레그램 봇 설정 (선택사항)

### 1. 봇 생성

1. Telegram에서 [@BotFather](https://t.me/botfather) 검색
2. `/newbot` 명령으로 새 봇 생성
3. 봇 토큰 복사

### 2. Chat ID 확인

1. 봇과 대화 시작
2. 다음 URL 방문: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. `chat.id` 값 확인

### 3. 환경 변수 설정

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

## 사용 방법

### 1. 대시보드

- 리뷰 통계 확인
- 대기 중, 답변 완료, 무시된 리뷰 수 조회

### 2. 리뷰 관리

- 리뷰 목록 조회 및 필터링
- 리뷰 상세 보기
- AI 생성 답변 3가지 옵션 중 선택
- 직접 답변 작성 (자동 번역)
- 답변 재생성
- 리뷰 무시

### 3. 지식베이스 관리

- 카테고리별 답변 템플릿 관리
- 키워드 및 우선순위 설정
- AI가 지식베이스를 참조하여 더 정확한 답변 생성

### 4. 텔레그램 (선택)

- 새 리뷰 자동 알림
- 인라인 버튼으로 빠른 답변 선택
- 무시 또는 웹에서 보기

## API 엔드포인트

### 인증

- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 사용자 등록

### 리뷰

- `GET /api/reviews` - 리뷰 목록 조회
- `GET /api/reviews/:id` - 리뷰 상세 조회
- `POST /api/reviews/:id/reply` - 답변 게시
- `POST /api/reviews/:id/ignore` - 리뷰 무시
- `POST /api/reviews/:id/regenerate` - 답변 재생성
- `GET /api/reviews/stats/summary` - 통계 조회

### 지식베이스

- `GET /api/knowledge-base` - 목록 조회
- `POST /api/knowledge-base` - 생성
- `PUT /api/knowledge-base/:id` - 수정
- `DELETE /api/knowledge-base/:id` - 삭제

## 데이터베이스 스키마

### reviews
- 리뷰 정보 (ID, 사용자, 평점, 텍스트, 언어, 상태)

### reply_suggestions
- AI 생성 답변 제안

### reply_history
- 답변 히스토리

### knowledge_base
- AI 학습용 지식베이스

### users
- 사용자 인증 정보

## 개발

### 백엔드 개발

```bash
cd backend
npm install
npm run dev
```

### 프론트엔드 개발

```bash
cd frontend
npm install
npm start
```

### 데이터베이스 마이그레이션

```bash
cd backend
npx prisma migrate dev
npx prisma studio  # DB 브라우저
```

## 문제 해결

### Google Play API 인증 오류

- 서비스 계정 키 파일 경로 확인
- Google Play Console에서 권한 확인
- API 활성화 확인

### AI 답변 생성 실패

- OpenAI API 키 확인
- API 사용량 및 크레딧 확인

### 텔레그램 봇 응답 없음

- 봇 토큰 및 Chat ID 확인
- 봇과 대화 시작 여부 확인

### Docker 컨테이너 시작 실패

```bash
# 로그 확인
docker-compose logs

# 컨테이너 재시작
docker-compose restart

# 완전 재빌드
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 보안 고려사항

- `.env` 파일을 절대 공개하지 마세요
- 강력한 JWT_SECRET 사용
- HTTPS 사용 권장
- 정기적인 비밀번호 변경
- 데이터베이스 정기 백업

## 라이선스

MIT License

## 기여

이슈 및 PR은 언제나 환영합니다!

## 지원

문제가 있으시면 [Issues](https://github.com/trollgameskr/Reviewer/issues)에 등록해주세요.
