# Reviewer 시스템 설치 가이드

## 개요

이 문서는 Reviewer 시스템을 처음부터 설치하는 상세한 가이드입니다.

## 1. 시스템 요구사항

### 최소 사양
- CPU: 2 코어
- RAM: 4GB
- 디스크: 20GB
- OS: Linux (Ubuntu 20.04+ 권장), macOS, Windows with WSL2

### 권장 사양
- CPU: 4 코어
- RAM: 8GB
- 디스크: 50GB
- OS: Linux (Ubuntu 22.04+)

## 2. 필수 소프트웨어 설치

### Docker & Docker Compose

#### Ubuntu/Debian
```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose 설치
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 설치 확인
docker --version
docker compose version
```

#### macOS
```bash
# Homebrew로 설치
brew install --cask docker

# Docker Desktop 실행
open -a Docker
```

#### Windows
1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) 다운로드
2. WSL2 백엔드 활성화
3. 설치 후 재부팅

## 3. Google Cloud 설정

### 3.1 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 3.2 API 활성화

```bash
# gcloud CLI 설치 (선택사항)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

1. Console에서 "API 및 서비스" > "라이브러리" 이동
2. "Google Play Android Developer API" 검색 및 활성화

### 3.3 서비스 계정 생성

1. "IAM 및 관리자" > "서비스 계정" 이동
2. "서비스 계정 만들기" 클릭
3. 이름: `reviewer-service-account`
4. 역할: `Service Account User`
5. "키 만들기" > JSON 형식 선택
6. 생성된 JSON 파일 다운로드 및 안전하게 보관

### 3.4 Google Play Console 권한 설정

1. [Google Play Console](https://play.google.com/console/) 접속
2. "설정" > "API 액세스" 이동
3. 서비스 계정 연결
4. 권한 부여: "앱 정보 보기", "리뷰에 답변"

## 4. OpenAI API 키 발급

1. [OpenAI Platform](https://platform.openai.com/) 접속
2. 계정 생성 또는 로그인
3. "API Keys" 메뉴에서 새 키 생성
4. 키를 안전하게 보관

## 5. 프로젝트 설치

### 5.1 저장소 클론

```bash
git clone https://github.com/trollgameskr/Reviewer.git
cd Reviewer
```

### 5.2 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 편집기로 .env 파일 수정
nano .env  # 또는 vim, vi 등
```

필수 설정 항목:
```env
# 데이터베이스 (기본값 사용 가능)
DATABASE_URL=postgresql://reviewer:reviewer_password@postgres:5432/reviewer_db

# 서버
PORT=3000
NODE_ENV=production
JWT_SECRET=랜덤한_긴_문자열_생성  # openssl rand -base64 32

# Google Play Console
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json
GOOGLE_PLAY_PACKAGE_NAME=com.yourapp.package  # 실제 패키지명으로 변경

# OpenAI
OPENAI_API_KEY=sk-실제_OpenAI_키  # 발급받은 키로 변경

# 프론트엔드 (배포 URL에 맞게 변경)
REACT_APP_API_URL=http://your-server-ip:3000/api
```

### 5.3 서비스 계정 키 배치

```bash
# credentials 디렉토리 생성
mkdir -p backend/credentials

# 다운로드한 JSON 키 파일 복사
cp ~/Downloads/your-service-account-key.json backend/credentials/service-account-key.json

# 권한 설정
chmod 600 backend/credentials/service-account-key.json
```

## 6. 시스템 실행

### 6.1 Docker로 실행

```bash
# 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 보기
docker-compose logs -f backend
```

### 6.2 상태 확인

```bash
# 컨테이너 상태 확인
docker-compose ps

# 정상 실행 시 출력 예시:
# NAME                  STATUS              PORTS
# reviewer-backend      Up 2 minutes        0.0.0.0:3000->3000/tcp
# reviewer-db           Up 2 minutes        0.0.0.0:5432->5432/tcp
# reviewer-frontend     Up 2 minutes        0.0.0.0:80->80/tcp
```

### 6.3 데이터베이스 초기화

```bash
# 마이그레이션 실행 (자동으로 실행됨)
docker-compose exec backend npm run migrate

# 확인
docker-compose exec backend npx prisma studio
```

## 7. 초기 사용자 생성

```bash
# API를 통한 사용자 생성
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'

# 성공 응답 예시:
# {
#   "user": {
#     "id": "...",
#     "username": "admin",
#     "role": "ADMIN"
#   }
# }
```

## 8. 웹 인터페이스 접속

1. 브라우저에서 `http://localhost` 또는 `http://your-server-ip` 접속
2. 생성한 사용자명과 비밀번호로 로그인
3. 대시보드 확인

## 9. 텔레그램 봇 설정 (선택사항)

### 9.1 봇 생성

1. Telegram 앱에서 @BotFather 검색
2. `/start` 명령 실행
3. `/newbot` 명령으로 새 봇 생성
4. 봇 이름과 사용자명 설정
5. 받은 토큰 복사

### 9.2 Chat ID 확인

```bash
# 봇과 대화 시작 후
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

# 응답에서 "chat":{"id":123456789} 찾기
```

### 9.3 환경 변수 추가

```bash
# .env 파일 수정
nano .env

# 다음 줄 추가
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# 재시작
docker-compose restart backend
```

## 10. 시놀로지 NAS 배포

### 10.1 SSH 활성화

1. 제어판 > 터미널 및 SNMP
2. "SSH 서비스 활성화" 체크
3. 포트: 22 (기본값)

### 10.2 Docker 설치

1. 패키지 센터 열기
2. "Docker" 검색 및 설치

### 10.3 파일 업로드

```bash
# 로컬에서 rsync로 업로드
rsync -avz --progress ./Reviewer/ admin@nas-ip:/volume1/docker/reviewer/

# 또는 File Station 사용
```

### 10.4 실행

```bash
# SSH 접속
ssh admin@nas-ip

# 프로젝트 디렉토리 이동
cd /volume1/docker/reviewer

# 실행
sudo docker-compose up -d

# 로그 확인
sudo docker-compose logs -f
```

### 10.5 자동 시작 설정

1. DSM 제어판 > 작업 스케줄러
2. "생성" > "예약된 작업" > "사용자 정의 스크립트"
3. 작업명: "Reviewer Auto Start"
4. 사용자: root
5. 이벤트: 부팅
6. 스크립트:
```bash
cd /volume1/docker/reviewer
docker-compose up -d
```

## 11. HTTPS 설정 (권장)

### 11.1 Let's Encrypt 인증서 발급

```bash
# Certbot 설치
sudo apt-get install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo certbot renew --dry-run
```

### 11.2 Nginx 리버스 프록시 설정

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 12. 백업 설정

### 12.1 데이터베이스 백업 스크립트

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL 백업
docker-compose exec -T postgres pg_dump -U reviewer reviewer_db > "$BACKUP_DIR/reviewer_$DATE.sql"

# 7일 이상 된 백업 삭제
find "$BACKUP_DIR" -name "reviewer_*.sql" -mtime +7 -delete

echo "Backup completed: reviewer_$DATE.sql"
```

### 12.2 Cron 설정

```bash
# crontab 편집
crontab -e

# 매일 새벽 3시 백업
0 3 * * * /path/to/backup.sh >> /var/log/reviewer-backup.log 2>&1
```

## 13. 모니터링 설정

### 13.1 로그 확인

```bash
# 실시간 로그
docker-compose logs -f --tail=100

# 특정 서비스 로그
docker-compose logs -f backend

# 로그 저장
docker-compose logs > logs/all-services.log
```

### 13.2 헬스 체크

```bash
# API 헬스 체크
curl http://localhost:3000/health

# 응답: {"status":"ok","timestamp":"..."}
```

## 14. 문제 해결

### 14.1 포트 충돌

```bash
# 사용 중인 포트 확인
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :5432

# docker-compose.yml에서 포트 변경
```

### 14.2 권한 문제

```bash
# Docker 권한 오류
sudo chmod 666 /var/run/docker.sock

# 파일 권한 수정
sudo chown -R $USER:$USER ./Reviewer
```

### 14.3 데이터베이스 연결 실패

```bash
# 컨테이너 상태 확인
docker-compose ps

# 데이터베이스 로그 확인
docker-compose logs postgres

# 데이터베이스 재시작
docker-compose restart postgres
```

### 14.4 완전 초기화

```bash
# 모든 컨테이너와 볼륨 삭제
docker-compose down -v

# 이미지 재빌드
docker-compose build --no-cache

# 다시 시작
docker-compose up -d
```

## 15. 성능 최적화

### 15.1 리소스 제한 설정

`docker-compose.yml`에 추가:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 15.2 데이터베이스 튜닝

```sql
-- PostgreSQL 성능 설정
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

## 16. 보안 체크리스트

- [ ] `.env` 파일 권한 설정 (chmod 600)
- [ ] 강력한 JWT_SECRET 사용
- [ ] 데이터베이스 비밀번호 변경
- [ ] HTTPS 활성화
- [ ] 방화벽 설정
- [ ] 정기 백업 구성
- [ ] 로그 모니터링 설정
- [ ] API Rate Limiting 확인

## 완료!

시스템이 정상적으로 실행되고 있다면 리뷰 자동 답변을 사용할 준비가 완료되었습니다.

추가 질문이나 문제가 있다면 GitHub Issues에 등록해주세요.
