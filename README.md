# VIBE — Telegram Mini App

> **Настройка Telegram:** см. [docs/TELEGRAM_SETUP.md](docs/TELEGRAM_SETUP.md)

Real-time geo-social network. "Don't be lonely. Find your vibe in 5 minutes."

## Стек

- **Next.js 14** (App Router)
- **TypeScript** (strict)
- **Tailwind CSS** (mobile-first)
- **shadcn/ui** + Lucide React + Framer Motion
- **Supabase** (@supabase/ssr, @supabase/supabase-js)

## Установка

```bash
npm install
```

## Настройка окружения

Скопируйте `.env.example` в `.env.local`:

```bash
cp .env.example .env.local
```

Заполните переменные:
- `NEXT_PUBLIC_SUPABASE_URL` — URL проекта Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public ключ Supabase
- `NEXT_PUBLIC_SITE_URL` — URL сайта (для production)

## Запуск

```bash
npm run dev
```

Приложение доступно на [http://localhost:3000](http://localhost:3000).

## Архитектура

### Структура директорий

```
/app
  /(public)     — публичные маршруты (login)
  /(root)       — защищённые маршруты (map, profile)
  layout.tsx
  page.tsx      — landing

/components
  /ui           — shadcn компоненты
  /shared       — Header, BottomNav
  /providers    — TelegramInitProvider

/lib
  /supabase     — client.ts, server.ts, middleware.ts
  telegram.ts   — initTelegramWebApp, isTelegramWebApp, getTelegramUser
  utils.ts      — cn()

/types          — db.ts
```

### Маршруты

| Путь   | Доступ   | Описание                          |
|--------|----------|-----------------------------------|
| `/`    | Публичный| Landing, в Telegram → редирект /map |
| `/login` | Публичный | Вход (заглушка)                 |
| `/map` | Защищён  | Карта                             |
| `/profile` | Защищён | Профиль пользователя          |

### Аутентификация

- Supabase Auth с SSR (@supabase/ssr)
- Middleware проверяет сессию для `/map` и `/profile`
- При отсутствии сессии — редирект на `/login`

### Telegram WebApp

- Скрипт подключается в `app/layout.tsx`
- `TelegramInitProvider` вызывает `ready()`, `expand()`, `disableVerticalSwipes()` при загрузке
- `lib/telegram.ts` — утилиты для работы с Telegram WebApp API
