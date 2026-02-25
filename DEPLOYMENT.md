# Vercel Deployment Checklist

## 1. Исправить .env.local (критично)

**SUPABASE_SERVICE_ROLE_KEY** — сейчас указан `modicqcpmtrzptyhysga` (это project ref, не ключ).

Получить правильный ключ:
1. [Supabase Dashboard](https://supabase.com/dashboard/project/modicqcpmtrzptyhysga/settings/api) → Settings → API
2. Скопировать **service_role** (secret, JWT длиной ~200+ символов)

## 2. Переменные для Vercel

В **Vercel → Project → Settings → Environment Variables** добавь:

| Переменная | Production | Описание |
|------------|------------|----------|
| `NEXT_PUBLIC_DEV_TEST_MODE` | `false` | Dev mock mode — отключить в prod |
| `NEXT_PUBLIC_DEV_TG_MOCK` | `false` | Dev Telegram mock — отключить в prod |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://modicqcpmtrzptyhysga.supabase.co` | Уже есть |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key JWT) | Уже есть |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role JWT) | **Исправить** — взять из Dashboard |
| `NEXT_PUBLIC_SITE_URL` | `https://твой-проект.vercel.app` | URL после деплоя |
| `TELEGRAM_AUTH_SECRET` | (32 hex chars) | Секрет для Telegram Login |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | (API key) | Для карт |
| `RATE_LIMIT_MESSAGES_WINDOW_S` | `10` | Опционально |
| `RATE_LIMIT_MESSAGES_MAX` | `5` | Опционально |

## 3. Supabase Auth — Redirect URLs

После деплоя добавь в **Supabase → Authentication → URL Configuration**:
- **Site URL:** `https://твой-проект.vercel.app`
- **Redirect URLs:** `https://твой-проект.vercel.app/**`

## 4. Telegram Bot — домен

В **@BotFather** → Bot Settings → set domain: `твой-проект.vercel.app`

## 5. Деплой

```bash
# Инициализировать git (если ещё не сделано)
git init
git add .
git commit -m "Production ready"

# Подключить к Vercel (через vercel CLI или GitHub)
npx vercel
# или: подключить репо на vercel.com → Import
```

## 6. Проверка после деплоя

- [ ] `/api/health` возвращает `{ ok: true }`
- [ ] `/map` загружается (auth или redirect на /login)
- [ ] Telegram Login работает
- [ ] Создание party и чат работают
