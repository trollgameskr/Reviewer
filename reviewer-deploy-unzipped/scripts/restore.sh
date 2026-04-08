#!/bin/bash

# Reviewer 복원 스크립트
# 백업된 데이터베이스를 복원합니다.

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKUP_FILE=$1
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}사용법: $0 <백업파일.sql.gz>${NC}"
    echo ""
    echo "사용 가능한 백업 파일:"
    ls -lht /var/backups/reviewer/db_*.sql.gz 2>/dev/null | head -10
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}오류: 백업 파일을 찾을 수 없습니다: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}경고: 현재 데이터베이스의 모든 데이터가 삭제됩니다!${NC}"
read -p "계속하시겠습니까? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "복원이 취소되었습니다."
    exit 0
fi

echo -e "${GREEN}=== 데이터베이스 복원 시작 ===${NC}"
echo "백업 파일: $BACKUP_FILE"
echo "시간: $(date)"

cd "$PROJECT_DIR"

# 데이터베이스 컨테이너 확인
if ! docker-compose ps | grep -q "reviewer-db.*Up"; then
    echo -e "${RED}오류: 데이터베이스 컨테이너가 실행 중이지 않습니다${NC}"
    exit 1
fi

# 백엔드 중지
echo -e "\n${YELLOW}백엔드 서비스 중지 중...${NC}"
docker-compose stop backend

# 데이터베이스 복원
echo -e "\n${YELLOW}데이터베이스 복원 중...${NC}"
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U reviewer -d reviewer_db

echo -e "${GREEN}✓ 데이터베이스 복원 완료${NC}"

# 백엔드 시작
echo -e "\n${YELLOW}백엔드 서비스 시작 중...${NC}"
docker-compose start backend

echo -e "\n${GREEN}=== 복원 완료 ===${NC}"
echo "데이터베이스가 성공적으로 복원되었습니다."

exit 0
