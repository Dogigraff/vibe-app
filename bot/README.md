# VIBE Telegram Bot (@vibe_aurapp_bot)

> ⚠️ **ЗАПУСКАЙ БОТА ИЗ ПАПКИ bot/**
>
> Не запускай `npm start` из корня репо — это Next.js. Бот живёт только в `bot/`.

## Windows PowerShell

```powershell
cd bot
copy .env.example .env
notepad .env   # вставить BOT_TOKEN от @BotFather
npm install
npm start
```

Должно вывести `BOT RUNNING` — значит бот работает.

## Переменные

| Переменная   | Описание              | По умолчанию                          |
|-------------|------------------------|----------------------------------------|
| `BOT_TOKEN` | Токен от @BotFather   | обязательна                            |
| `WEBAPP_URL`| URL Mini App          | `https://vibe-app-mu.vercel.app`       |

## Команды

- `/start` — текст + кнопки «Открыть VIBE» (WebApp), «Как работает», «Поделиться»
- `/help` — инструкция + кнопка «Открыть VIBE»

## Деплой

Node.js 18+. Railway, Render, Fly.io. Укажи `BOT_TOKEN` и `WEBAPP_URL`.
