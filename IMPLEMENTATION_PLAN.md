# VIBE — Финальный план реализации

Проект VIBE — это Telegram Mini App (геосоциальная сеть) с картой вайбов, чатом и системой репутации. Фундамент (Next.js App Router, Supabase, БД-схема) готов. Нужно: закрыть SEO-дыры, реализовать недостающий UI и улучшить качество.

> **ВАЖНО:** Поскольку это **Telegram Mini App**, SEO фокусируем только на публичном лендинге `/`. Все страницы за авторизацией (`/map`, `/profile`) из индекса закрываем.

---

## Блок 1 — SEO (быстро, высокий ROI)

### [NEW] `app/robots.ts`

Запрещает индексацию `/map`, `/profile`, `/login`, `/api/*`. Разрешает только `/`.

### [NEW] `app/sitemap.ts`

Один URL: корень сайта с `lastModified`.

### [NEW] `public/og-image.png`

Брендовая картинка 1200×630 для шаринга в Telegram/соцсетях.

### [MODIFY] `app/layout.tsx`

- Добавить полный `metadata`: `openGraph`, `twitter`, `metadataBase`, `icons`, `robots`
- Исправить `lang="ru"` → `lang="en"`
- Добавить `JSON-LD` (`WebApplication` schema)

### [MODIFY] `next.config.js`

- Добавить `compress: true`
- Добавить security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)

### [MODIFY] `components/landing-or-login.tsx`

Сделать контент SSR-дружелюбным — убрать зависимость от `useEffect` для основного контента. Клиентский редирект в Telegram оставить, но только как слой поверх полноценного HTML.

---

## Блок 2 — Недостающий UI

### [MODIFY] `app/(root)/profile/page.tsx`

Реализовать страницу профиля: загрузка из Supabase, отображение `username`, `bio`, `tags`, `reputation`, аватара.

### [NEW] `features/chat/PartyChat.tsx`

Realtime-чат через Supabase Realtime (`supabase.channel()`). Только для участников вайба (`party_members`).

### [NEW] `features/parties/JoinVibeButton.tsx`

Кнопка "Стучусь" — создаёт `party_request` → API `/api/parties/request`.

### [MODIFY] `features/map/VibeMap.tsx`

Карточка выбранного вайба: добавить кнопку "Присоединиться" (→ `JoinVibeButton`).

---

## Блок 3 — Качество и UX

### Framer Motion анимации

Анимация появления карточки вайба, модалки создания, кнопок. (Framer Motion уже установлен, но не используется.)

### Тёмная тема

CSS-переменные `.dark` уже есть в `globals.css`. Добавить переключатель в шапку + сохранение в `localStorage`.

---

## Верификация

### Автоматическая (build)

```bash
npm run build
# Должен завершиться без ошибок
```

### Ручная проверка SEO

1. Открыть `http://localhost:3000/robots.txt` — должны видеть правила
2. Открыть `http://localhost:3000/sitemap.xml` — должен быть XML
3. Открыть `http://localhost:3000` — правой кнопкой "Просмотр кода" → убедиться, что `<title>`, `<meta og:...>` присутствуют в HTML (не JS)
4. Вставить URL в [opengraph.xyz](https://opengraph.xyz) — проверить карточку шаринга

### Ручная проверка UI

1. Запустить `npm run dev`
2. Открыть `http://localhost:3000/map` — нажать на маркер вайба → должна появиться кнопка "Присоединиться"
3. Открыть `http://localhost:3000/profile` — должна отображаться информация профиля

---

## Порядок реализации

```
1. SEO блок (30 мин) — быстрый win, никаких рисков
2. Profile page (45 мин)
3. JoinVibeButton + API (30 мин)
4. PartyChat (1–1.5 ч) — самое сложное
5. UX-полировка (30 мин)
```
