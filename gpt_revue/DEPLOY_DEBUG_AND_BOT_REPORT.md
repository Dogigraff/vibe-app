# Отчёт: Dev Debug + Telegram Bot

**Дата:** 2026-02-25

---

## Задача A — Dev Debug скрыт в production

**Изменённые файлы:**
- `features/map/VibeMap.tsx`
- `lib/supabase/middleware.ts`

**Что сделано:**
1. Добавлена двойная защита: блок «Dev Debug» показывается только при `NEXT_PUBLIC_DEV_TEST_MODE === 'true'` **и** `NODE_ENV !== 'production'`.
2. Страница `/tg-debug` в production и при `DEV_TEST_MODE=false` редиректит на `/`.

В Vercel (NODE_ENV=production, DEV_TEST_MODE=false) блок Dev Debug не рендерится, `/tg-debug` недоступен.

---

## Задача B — /api/health и debug endpoints

**Результат:**
- `/api/health` — оставлен для мониторинга (минимальный ответ: ok, timestamp, env flags). UI-кнопки удалены.
- `/api/auth/dev-mock` — уже возвращает 403, если `NEXT_PUBLIC_DEV_TG_MOCK !== 'true'`.
- Дополнительных правок не требовалось.

---

## Задача C — Telegram Bot UX

**Создана папка `bot/`:**
- `bot/index.js` — бот на Telegraf
- `bot/package.json` — зависимости (telegraf, dotenv)
- `bot/.env.example` — шаблон конфига
- `bot/README.md` — инструкция по запуску

**Поведение:**
- `/start` → «VIBE — найди людей рядом за 5 минут. Нажми кнопку ниже.» + InlineKeyboard:
  - «Открыть VIBE» (WebApp) → `https://vibe-app-mu.vercel.app`
  - «Как работает» → краткая инструкция
  - «Поделиться» → ссылка на бота + подсказка
- `/help` → та же инструкция + кнопка «Открыть VIBE»

**Переменные окружения бота:**
- `BOT_TOKEN` — токен от @BotFather
- `WEBAPP_URL` — URL Mini App (по умолчанию `https://vibe-app-mu.vercel.app`)

---

## Задача D — Build и коммиты

**Build:** `npm run build` — успешен.

**Коммиты:**
1. `573322d` — hide dev debug in production
2. `4500574` — telegram bot start ux

**Push:** выполнить вручную (`git push origin main`) при доступной сети. Ранее была ошибка SSL/TLS.

---

## Инструкция по запуску бота

```bash
cd bot
cp .env.example .env
# Заполни BOT_TOKEN (из @BotFather) и при необходимости WEBAPP_URL
npm install
npm start
```

Для продакшена запускай бота на VPS или Railway/Render/Fly.io с переменными `BOT_TOKEN` и `WEBAPP_URL`.

---

## Подтверждение

- Dev Debug в production скрыт: да.
- Mini App работает как раньше: да.
- `/api/health` доступен для мониторинга: да.
