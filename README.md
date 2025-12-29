# Cloud Strike

Панель управления игровыми серверами Counter-Strike 2. Современный веб-интерфейс в стиле Apple для управления CS2 серверами через Docker.

## Возможности

- Создание и управление CS2 серверами
- Мониторинг ресурсов (CPU, RAM, диск)
- Просмотр Docker логов в реальном времени
- RCON консоль для отправки команд на сервер
- Файловый менеджер для редактирования конфигов
- Управление настройками сервера
- Современный UI в стиле Apple

## Технологии

**Frontend:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- TanStack Query

**Backend:**
- Go 1.23
- Docker SDK
- gorcon/rcon

## Требования

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM (минимум)
- 10GB свободного места на диске

## Быстрый старт

### Автоматическое развёртывание

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/cloud-strike.git
cd cloud-strike

# Запустить скрипт развёртывания
chmod +x deploy.sh
./deploy.sh
```

### Ручное развёртывание

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/cloud-strike.git
cd cloud-strike

# Собрать и запустить
docker compose build
docker compose up -d
```

После запуска:
- Панель управления: `http://your-server-ip:3000`
- API сервер: `http://your-server-ip:8080`

## Развёртывание на VDS

### 1. Подготовка сервера

```bash
# Обновить систему (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Перезайти в сессию
exit
# ... подключиться заново

# Проверить установку
docker --version
docker compose version
```

### 2. Клонирование и запуск

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/cloud-strike.git
cd cloud-strike

# Запустить
chmod +x deploy.sh
./deploy.sh
```

### 3. Настройка фаервола (опционально)

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp  # Панель
sudo ufw allow 8080/tcp  # API
sudo ufw allow 27015/udp # CS2 (по умолчанию)
sudo ufw allow 27015/tcp # CS2 RCON
```

### 4. Настройка Nginx (опционально)

Для доступа по домену без порта:

```nginx
server {
    listen 80;
    server_name panel.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Локальная разработка

### Backend

```bash
cd backend
go mod download
go run ./cmd/server
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Переменные окружения

### Backend

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт API сервера | `8080` |

### Frontend

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `NEXT_PUBLIC_API_URL` | URL API сервера | `http://localhost:8080/api` |

## Управление

```bash
# Просмотр логов
docker compose logs -f

# Просмотр логов конкретного сервиса
docker compose logs -f backend
docker compose logs -f frontend

# Перезапуск
docker compose restart

# Остановка
docker compose down

# Остановка с удалением данных
docker compose down -v

# Обновление
git pull
docker compose build --no-cache
docker compose up -d
```

## Структура проекта

```
cloud-strike/
├── backend/                 # Go API сервер
│   ├── cmd/server/         # Точка входа
│   ├── internal/
│   │   ├── api/           # HTTP handlers
│   │   ├── config/        # Конфигурация
│   │   ├── docker/        # Docker SDK клиент
│   │   └── rcon/          # RCON клиент
│   ├── Dockerfile
│   └── go.mod
├── frontend/               # Next.js приложение
│   ├── app/               # Страницы (App Router)
│   ├── components/        # React компоненты
│   ├── lib/               # Утилиты и API
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker Compose конфиг
├── deploy.sh              # Скрипт развёртывания
└── README.md
```

## API Endpoints

### Серверы

- `GET /api/servers` - Список серверов
- `POST /api/servers` - Создать сервер
- `POST /api/servers/{id}/start` - Запустить сервер
- `POST /api/servers/{id}/stop` - Остановить сервер
- `DELETE /api/servers/{id}` - Удалить сервер

### Статистика

- `GET /api/servers/{id}/stats` - Статистика сервера
- `GET /api/servers/{id}/logs` - Docker логи

### RCON

- `POST /api/servers/{id}/rcon/connect` - Подключиться к RCON
- `POST /api/servers/{id}/rcon/command` - Отправить команду
- `POST /api/servers/{id}/rcon/disconnect` - Отключиться
- `GET /api/servers/{id}/rcon/status` - Статус подключения

### Файлы

- `GET /api/servers/{id}/files` - Список файлов
- `DELETE /api/servers/{id}/files` - Удалить файл
- `POST /api/servers/{id}/files/upload` - Загрузить файл
- `GET /api/servers/{id}/files/download` - Скачать файл

### Настройки

- `GET /api/servers/{id}/settings` - Получить настройки
- `PUT /api/servers/{id}/settings` - Обновить настройки

## Устранение неполадок

### Панель не открывается

1. Проверьте, что контейнеры запущены:
   ```bash
   docker compose ps
   ```

2. Проверьте логи:
   ```bash
   docker compose logs frontend
   ```

3. Проверьте, открыт ли порт:
   ```bash
   sudo lsof -i :3000
   ```

### RCON не подключается

1. Убедитесь, что CS2 сервер полностью запустился (проверьте логи)
2. Проверьте, что RCON пароль установлен при создании сервера
3. CS2 серверу требуется 3-5 минут на первый запуск (скачивание файлов)

### Сервер не создаётся

1. Проверьте логи backend:
   ```bash
   docker compose logs backend
   ```

2. Убедитесь, что Docker socket примонтирован:
   ```bash
   ls -la /var/run/docker.sock
   ```

3. Проверьте права доступа:
   ```bash
   sudo chmod 666 /var/run/docker.sock
   ```

## Лицензия

MIT

## Автор

Cloud Strike Panel - панель управления CS2 серверами
