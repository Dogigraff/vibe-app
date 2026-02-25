# VIBE Telegram Bot

Минимальный бот для приветствия и запуска WebApp.

## Установка

```bash
cd bot
npm install
```

## Настройка

Скопируй `.env.example` в `.env`:

```bash
cp .env.example .env
```

Заполни:

- `BOT_TOKEN` — токен от @BotFather
- `WEBAPP_URL` — URL Mini App (по умолчанию `https://vibe-app-mu.vercel.app`)

## Запуск

```bash
npm start
```

Или с авто-перезагрузкой при изменениях:

```bash
npm run dev
```

## Команды

- `/start` — приветствие + кнопки «Открыть VIBE», «Как работает», «Поделиться»
- `/help` — краткая инструкция + кнопка «Открыть VIBE»

## Деплой

Бот можно запустить на любом VPS (Node.js 18+) или сервисе типа Railway, Render, Fly.io. Укажи переменные окружения `BOT_TOKEN` и `WEBAPP_URL`.
