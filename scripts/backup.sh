#!/bin/bash

# Reviewer 백업 스크립트
# 매일 자동으로 데이터베이스와 중요 파일을 백업합니다.

set -e

# 설정
BACKUP_DIR="${BACKUP_DIR:-/var/backups/reviewer}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Reviewer 백업 시작 ===${NC}"
echo "시간: $(date)"
echo "백업 디렉토리: $BACKUP_DIR"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# 데이터베이스 백업
echo -e "\n${YELLOW}데이터베이스 백업 중...${NC}"
cd "$PROJECT_DIR"

if docker-compose ps | grep -q "reviewer-db.*Up"; then
    docker-compose exec -T postgres pg_dump -U reviewer reviewer_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
    echo -e "${GREEN}✓ 데이터베이스 백업 완료: db_$DATE.sql.gz${NC}"
else
    echo -e "${RED}✗ 데이터베이스 컨테이너가 실행 중이지 않습니다${NC}"
    exit 1
fi

# .env 파일 백업
echo -e "\n${YELLOW}환경 설정 백업 중...${NC}"
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$BACKUP_DIR/env_$DATE.backup"
    echo -e "${GREEN}✓ 환경 설정 백업 완료: env_$DATE.backup${NC}"
fi

# 서비스 계정 키 백업 (존재하는 경우)
if [ -d "$PROJECT_DIR/backend/credentials" ]; then
    tar -czf "$BACKUP_DIR/credentials_$DATE.tar.gz" -C "$PROJECT_DIR/backend" credentials
    echo -e "${GREEN}✓ 인증 정보 백업 완료: credentials_$DATE.tar.gz${NC}"
fi

# 오래된 백업 삭제
echo -e "\n${YELLOW}오래된 백업 정리 중...${NC}"
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_*.backup" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "credentials_*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✓ ${RETENTION_DAYS}일 이상 된 백업 삭제 완료${NC}"

# 백업 크기 확인
echo -e "\n${YELLOW}백업 크기:${NC}"
du -sh "$BACKUP_DIR"

echo -e "\n${GREEN}=== 백업 완료 ===${NC}"
echo "백업 위치: $BACKUP_DIR"
echo "다음 파일들이 백업되었습니다:"
ls -lh "$BACKUP_DIR" | grep "$DATE"

exit 0
