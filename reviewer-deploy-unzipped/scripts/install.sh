#!/bin/bash

# Reviewer 설치 스크립트
# 시스템을 자동으로 설치하고 구성합니다.

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════╗
║   Reviewer 설치 스크립트              ║
║   AI 기반 구글 플레이 리뷰 답변 시스템 ║
╚═══════════════════════════════════════╝
EOF
echo -e "${NC}"

# Docker 확인
echo -e "${YELLOW}1. Docker 확인 중...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}오류: Docker가 설치되어 있지 않습니다.${NC}"
    echo "다음 명령으로 Docker를 설치하세요:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}오류: Docker Compose가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 및 Docker Compose 확인 완료${NC}"

# .env 파일 생성
echo -e "\n${YELLOW}2. 환경 설정 파일 생성 중...${NC}"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ .env 파일이 생성되었습니다${NC}"
    echo -e "${YELLOW}⚠ .env 파일을 편집하여 다음 항목을 설정하세요:${NC}"
    echo "  - JWT_SECRET (랜덤 문자열)"
    echo "  - GOOGLE_PLAY_PACKAGE_NAME"
    echo "  - OPENAI_API_KEY"
    echo "  - (선택) TELEGRAM_BOT_TOKEN"
    echo ""
    read -p "설정을 완료했으면 Enter를 눌러주세요..." -r
else
    echo -e "${GREEN}✓ .env 파일이 이미 존재합니다${NC}"
fi

# credentials 디렉토리 확인
echo -e "\n${YELLOW}3. Google 서비스 계정 키 확인 중...${NC}"
if [ ! -f backend/credentials/service-account-key.json ]; then
    echo -e "${YELLOW}⚠ 서비스 계정 키 파일이 없습니다${NC}"
    echo "backend/credentials/service-account-key.json 경로에 키 파일을 배치하세요"
    read -p "키 파일을 배치했으면 Enter를 눌러주세요..." -r
fi

if [ -f backend/credentials/service-account-key.json ]; then
    echo -e "${GREEN}✓ 서비스 계정 키 파일 확인 완료${NC}"
else
    echo -e "${RED}오류: 서비스 계정 키 파일을 찾을 수 없습니다${NC}"
    exit 1
fi

# Docker 이미지 빌드
echo -e "\n${YELLOW}4. Docker 이미지 빌드 중...${NC}"
docker-compose build

echo -e "${GREEN}✓ Docker 이미지 빌드 완료${NC}"

# 컨테이너 시작
echo -e "\n${YELLOW}5. 서비스 시작 중...${NC}"
docker-compose up -d

echo -e "${GREEN}✓ 서비스 시작 완료${NC}"

# 서비스 상태 확인
echo -e "\n${YELLOW}6. 서비스 상태 확인 중...${NC}"
sleep 5
docker-compose ps

# 헬스 체크
echo -e "\n${YELLOW}7. API 헬스 체크...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API 서버가 정상적으로 실행 중입니다${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""

# 초기 사용자 생성 안내
echo -e "\n${YELLOW}8. 초기 사용자 생성${NC}"
echo "다음 명령으로 초기 사용자를 생성하세요:"
echo ""
echo -e "${BLUE}curl -X POST http://localhost:3000/api/auth/register \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"username\": \"admin\","
echo "    \"password\": \"your-password\""
echo "  }'${NC}"
echo ""

read -p "지금 생성하시겠습니까? (y/n): " -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "사용자명을 입력하세요: " USERNAME
    read -sp "비밀번호를 입력하세요: " PASSWORD
    echo ""

    RESULT=$(curl -s -X POST http://localhost:3000/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

    if echo "$RESULT" | grep -q "user"; then
        echo -e "${GREEN}✓ 사용자가 생성되었습니다${NC}"
    else
        echo -e "${RED}오류: 사용자 생성 실패${NC}"
        echo "$RESULT"
    fi
fi

# 완료
echo -e "\n${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     설치가 완료되었습니다!              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}웹 인터페이스: http://localhost${NC}"
echo -e "${BLUE}API 엔드포인트: http://localhost:3000${NC}"
echo ""
echo "로그 확인: docker-compose logs -f"
echo "서비스 중지: docker-compose down"
echo "서비스 재시작: docker-compose restart"
echo ""
echo -e "${YELLOW}⚠ 보안을 위해 프로덕션 환경에서는 HTTPS를 사용하세요${NC}"
echo ""

exit 0
