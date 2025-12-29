#!/bin/bash

# Cloud Strike - Deployment Script
# Скрипт развёртывания Cloud Strike панели управления CS2 серверами

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Cloud Strike - CS2 Server Panel                ║${NC}"
echo -e "${GREEN}║                  Deployment Script                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker не установлен!${NC}"
    echo -e "${YELLOW}Установите Docker: https://docs.docker.com/engine/install/${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}[ERROR] Docker Compose не установлен!${NC}"
    echo -e "${YELLOW}Установите Docker Compose: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Docker и Docker Compose установлены${NC}"

# Check if docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}[ERROR] Docker daemon не запущен!${NC}"
    echo -e "${YELLOW}Запустите Docker: sudo systemctl start docker${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Docker daemon работает${NC}"

# Get the server IP address
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

echo ""
echo -e "${YELLOW}Конфигурация:${NC}"
echo -e "  IP сервера: ${GREEN}$SERVER_IP${NC}"
echo -e "  Панель будет доступна: ${GREEN}http://$SERVER_IP:3000${NC}"
echo -e "  API будет доступен: ${GREEN}http://$SERVER_IP:8080${NC}"
echo ""

# Build and start containers
echo -e "${YELLOW}[1/3] Сборка Docker образов...${NC}"
docker compose build --no-cache

echo -e "${YELLOW}[2/3] Запуск контейнеров...${NC}"
docker compose up -d

echo -e "${YELLOW}[3/3] Проверка статуса...${NC}"
sleep 5

# Check if containers are running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Развёртывание успешно завершено!             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Панель управления: ${GREEN}http://$SERVER_IP:3000${NC}"
    echo -e "API сервер: ${GREEN}http://$SERVER_IP:8080${NC}"
    echo ""
    echo -e "${YELLOW}Полезные команды:${NC}"
    echo -e "  Просмотр логов:    ${GREEN}docker compose logs -f${NC}"
    echo -e "  Остановка:         ${GREEN}docker compose down${NC}"
    echo -e "  Перезапуск:        ${GREEN}docker compose restart${NC}"
    echo ""
else
    echo -e "${RED}[ERROR] Контейнеры не запустились!${NC}"
    echo -e "${YELLOW}Проверьте логи: docker compose logs${NC}"
    exit 1
fi
