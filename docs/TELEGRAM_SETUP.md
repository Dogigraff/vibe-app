# Настройка Telegram Bot и WebApp

Пошаговая инструкция для создания бота и настройки VIBE как Telegram Mini App.

---

## 1. Создание бота в @BotFather

1. Открой [@BotFather](https://t.me/botfather) в Telegram.
2. Отправь `/newbot`.
3. Введи имя бота (например: `VIBE — геосоциальная сеть`).
4. Введи username бота (должен заканчиваться на `bot`, например: `VibeGeoBot`).
5. **Сохрани Bot Token** — он понадобится для `TELEGRAM_BOT_TOKEN` (опционально для уведомлений/webhook).

---

## 2. Настройка Menu Button (обязательно)

Чтобы пользователи могли открыть WebApp из Telegram:

1. Отправь `/mybots` в @BotFather.
2. Выбери своего бота.
3. **Bot Settings** → **Menu Button** → **Configure menu button**.
4. Введи **публичный HTTPS-URL** приложения:
   - **Локально:** используй ngrok: `ngrok http 3000` → скопируй URL вида `https://xxxx.ngrok-free.app`.
   - **Production:** `https://vibe-app-mu.vercel.app` (или твой домен Vercel).
5. Сохрани.

> Без этого initData не будет передаваться, и логин не сработает.

---

## 3. Переменные окружения

### Обязательные

| Переменная | Описание | Как получить |
|------------|----------|--------------|
| `TELEGRAM_AUTH_SECRET` | Секрет для генерации паролей Supabase (synthetic users) | Сгенерировать: `openssl rand -hex 32` или `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SITE_URL` | URL приложения (production) | `https://твой-проект.vercel.app` |

### Опциональные (для dev)

| Переменная | Описание | Production |
|------------|----------|------------|
| `NEXT_PUBLIC_DEV_TEST_MODE` | Режим без авторизации на /map | `false` |
| `NEXT_PUBLIC_DEV_TG_MOCK` | Mock Telegram для dev без реального бота | `false` |

### Опциональные (бот в `bot/`)

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | Token бота от @BotFather (в корне .env — для справки). |
| `BOT_TOKEN` | В `bot/.env` — для запуска бота (см. `bot/README.md`). |

---

## 4. Генерация TELEGRAM_AUTH_SECRET

```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 })) -replace '+','' -replace '/','' -replace '=','' | % { $_[0..63] -join '' }
```

Или в Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Результат — 64 hex-символа (32 байта). Пример: `7f3026b097c678056275ea897455b66c05cd41d96fbfa4f5177800032b984263`

---

## 5. Vercel — переменные

В **Vercel → Project → Settings → Environment Variables** добавь:

- `TELEGRAM_AUTH_SECRET` (secret)
- `NEXT_PUBLIC_SITE_URL` = `https://vibe-app-mu.vercel.app`
- `NEXT_PUBLIC_DEV_TEST_MODE` = `false`
- `NEXT_PUBLIC_DEV_TG_MOCK` = `false`

---

## 6. Telegram-бот (папка `bot/`)

Отдельный бот для приветствия и кнопок — `/start`, `/help`, «Открыть VIBE», «Как работает», «Поделиться».

Запуск:
```bash
cd bot
cp .env.example .env
# BOT_TOKEN=... WEBAPP_URL=https://vibe-app-mu.vercel.app
npm install && npm start
```

Подробнее: **bot/README.md**.

---

## 7. Проверка

1. **Через Telegram:** открой бота → Menu → должно открыться приложение.
2. **Debug-страница** (только в dev): `/tg-debug` через Menu Button — покажет `isTelegramWebApp`, `initData length`.
3. **Логин:** авторизация должна проходить без ошибок.

---

## Частые проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
| «Откройте приложение через Telegram» | Страница открыта в браузере, а не в Telegram | Открыть через Menu Button бота |
| initData length = 0 | Menu Button не настроен или URL неверный | Проверить BotFather → Menu Button |
| 500 TELEGRAM_AUTH_SECRET | Переменная не задана | Добавить в .env.local и Vercel |
| 401 Unauthorized | Supabase auth не настроен | Проверить Supabase redirect URLs |
| **Ошибка входа** (Email not confirmed) | Supabase требует подтверждение email | Supabase Dashboard → Authentication → Providers → Email → **отключить** "Confirm email" |
| **Ошибка входа** (другая) | См. код ошибки под текстом | Нажать «Повторить», перезайти через Menu Button; при повторе — смотреть Vercel logs |
