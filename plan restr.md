VIBE
Геосоциальная сеть — Telegram Mini App
Технический план разработки для Antigravity

Стек: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Яндекс.Карты
Версия документа: 1.0 · Март 2026

0. Контекст проекта
VIBE — Telegram Mini App, геосоциальная сеть реального времени. Пользователь открывает приложение, видит карту с активными 'вайбами' (тусовками) поблизости, стучится на вступление, попадает в чат участников.
Слоган: "Don't be lonely. Find your vibe in 5 minutes."
Что уже работает локально
•	Карта с маркерами вайбов (Яндекс.Карты через @pbe/react-yandex-maps)
•	Авторизация через Telegram (Supabase SSR Auth)
•	Middleware: защищённые роуты /map, /profile — редирект на /login
•	Базовая структура Next.js 14 App Router
Структура БД (Supabase)
Основные таблицы (все с RLS):
•	profiles — профили пользователей (username, avatar, bio, tags, reputation)
•	parties — вайбы/тусовки (location geography, mood, expires_at, status)
•	party_members — участники вайба (role: host/guest)
•	party_requests — заявки на вступление (status: pending/rejected)
•	messages — чат (E2E: ciphertext, nonce, e2e_version, sender_device_id)
•	user_devices — ключи устройств для E2E шифрования
•	party_room_keys — зашифрованные ключи комнат (AES-GCM)
Важно: таблица messages имеет E2E-поля добавленные миграцией 20260223220000_e2e_encryption.sql. Типы в types/supabase.ts устарели и не содержат этих полей — требуется регенерация (см. Шаг 3.1).


1. Фаза 1 — Фундамент (критические фиксы)
Цель: убрать блокеры запуска. Без этих правок продакшн запускать нельзя.
1.1 Лендинг — SSR Server Component
Проблема
app/page.tsx использовал клиентский useEffect для редиректа авторизованных пользователей. Поисковые боты и Telegram при генерации превью видели пустую страницу без текста, потому что JS не выполняется на этапе сканирования.
Что сделано
Файл переписан как async Server Component. Авторизация проверяется на сервере через createClient(). Добавлен export const metadata с полным набором OpenGraph-тегов на русском языке.
Ключевые изменения
•	Убран useEffect-редирект, теперь redirect('/map') выполняется на сервере
•	Добавлен export const metadata: Metadata с title, description, openGraph, robots
•	Весь публичный текст переведён на русский (SEO: lang='ru' теперь соответствует контенту)
•	CTA кнопка ведёт на /login, текст 'Открыть VIBE'
Файл: app/page.tsx

1.2 Заголовки безопасности — next.config.js
Проблема
В next.config.js отсутствовали критически важные заголовки. Особенно опасно для Telegram Mini App: если добавить X-Frame-Options: DENY, приложение перестанет открываться внутри Telegram (он рендерит Mini App во фрейме).
Что добавлено
•	Content-Security-Policy (CSP) — разрешены Telegram-домены, Supabase, Яндекс.Карты
•	frame-ancestors в CSP вместо X-Frame-Options — позволяет Telegram открывать во фрейме
•	X-XSS-Protection: 1; mode=block
•	Strict-Transport-Security — только для NODE_ENV=production
•	Cache-Control для статики и OG-image
Критически важно
НЕ добавлять X-Frame-Options: DENY или SAMEORIGIN — это сломает Mini App. Telegram открывает приложение во фрейме, поэтому ограничение на встраивание управляется только через CSP frame-ancestors.
Файл: next.config.js

1.3 SEO — sitemap.ts и robots.ts
Зачем
Без этих файлов поисковики могут индексировать закрытые страницы (/map, /profile) — это бессмысленно и плохо для SEO. sitemap.ts помогает Google найти главную страницу.
•	app/sitemap.ts — только публичная страница '/' с приоритетом 1.0
•	app/robots.ts — Allow: /, Disallow: /map /profile /login /api/ /tg-debug
Примечание: middleware.ts уже добавляет X-Robots-Tag: noindex для закрытых страниц — это второй уровень защиты.

1.4 Favicon и OG-image
Зачем
Без favicon.svg в браузере отображается серая стандартная иконка. Без og-image при пересылке ссылки в Telegram нет красивой карточки превью — только текст.
•	app/icon.svg — буква V с градиентом violet→blue, скруглённый фон
•	app/opengraph-image.tsx — ImageResponse 1200x630, тёмный фон, градиентный VIBE
Next.js 14 автоматически подхватывает эти файлы по именам icon.svg и opengraph-image.tsx.

1.5 JoinVibeButton + API endpoint
Зачем
Основная механика приложения — пользователь видит вайб на карте и стучится. Без этой кнопки карта работает только как просмотровщик.
Компонент: components/join-vibe-button.tsx
Клиентский компонент с тремя состояниями:
•	none → кнопка 'Стучусь', violet, кликабельна
•	pending → 'Ожидаю...', серая, disabled
•	joined → 'Я здесь', зелёная, disabled
Реализован optimistic update: кнопка сразу переходит в pending при клике, без ожидания сервера. Если сервер вернул ошибку — откат к предыдущему состоянию.
API: app/api/vibes/join/route.ts
POST endpoint. Проверяет авторизацию через createClient(). Делает upsert в таблицу vibe_participants. Возвращает 409 если уже joined, 200 с { status: 'pending' } при успехе.
Текущий статус: файл написан, ошибки TypeScript исправлены (.maybeSingle() вместо .single(), as any как временное решение до регенерации типов).
Итоговая таблица — Фаза 1
Задача	Статус	Файл/путь
Лендинг SSR + метатеги	✅ Готово	app/page.tsx
CSP и заголовки безопасности	✅ Готово	next.config.js
sitemap.ts	✅ Готово	app/sitemap.ts
robots.ts	✅ Готово	app/robots.ts
Favicon (icon.svg)	✅ Готово	app/icon.svg
OG-image	✅ Готово	app/opengraph-image.tsx
JoinVibeButton компонент	✅ Готово	components/join-vibe-button.tsx
API /api/vibes/join	✅ Готово	app/api/vibes/join/route.ts
 


2. Фаза 2 — Ядро продукта
Цель: минимальный набор функций чтобы приложение стало продуктом, а не просто картой с пинами. После этой фазы можно приглашать первых пользователей.
2.1 Регенерация типов Supabase (ПЕРВЫЙ ШАГ)
Почему это первым делом
Миграция 20260223220000_e2e_encryption.sql добавила в таблицу messages поля ciphertext, nonce, e2e_version, sender_device_id. Но файл types/supabase.ts генерировался до этой миграции и эти поля не знает.
Из-за этого весь код чата (PartyChat.tsx, API messages) работает через 'as any' — TypeScript не проверяет типы. После регенерации as any можно убрать и получить нормальную типизацию.
Команда
npx supabase gen types typescript --project-id ВАШ_PROJECT_ID > types/supabase.ts
PROJECT_ID — это часть NEXT_PUBLIC_SUPABASE_URL из .env. Например: https://abcdefgh.supabase.co → project-id = abcdefgh
Что проверить после
В types/supabase.ts в блоке messages должны появиться:
•	ciphertext: string | null
•	nonce: string | null
•	e2e_version: number
•	sender_device_id: string | null

2.2 Realtime чат — PartyChat.tsx
Текущее состояние
Файл features/chat/PartyChat.tsx уже написан и содержит полноценную реализацию:
•	E2E шифрование (AES-GCM через WebCrypto API)
•	Управление ключами устройства (user_devices в Supabase)
•	Realtime подписка через supabase.channel() на INSERT в таблицу messages
•	Rate limiting через RPC allow_action
•	Optimistic UI, AnimatePresence (Framer Motion), автоскролл
Зависимости в БД (должны быть применены)
Для работы чата нужны следующие миграции:
•	20260213052612 — базовая схема (messages, party_members)
•	20260223220000 — E2E поля в messages
•	20260223210000 — rate_limiting (функция allow_action)
•	20260213190000 — RPC ensure_party_room_key
Что нужно доделать
•	После регенерации типов (п. 2.1) убрать все 'as any' из PartyChat.tsx и messages/route.ts
•	Подключить PartyChat в карточку вайба (передать partyId и currentUserId)
•	Проверить что Supabase Realtime включён для таблицы messages в Dashboard
Файлы: features/chat/PartyChat.tsx, app/api/parties/messages/route.ts

2.3 Страница профиля
Зачем
Без профиля приложение анонимное. Репутация и бейджи — главный механизм доверия между участниками вайбов.
Что реализовать
•	app/profile/page.tsx — Server Component, получает данные из таблицы profiles
•	Вывод: avatar (из Telegram), username, bio, tags[], reputation
•	Кнопка редактирования bio и тегов
•	Список вайбов пользователя (последние 5)
Данные профиля создаются автоматически триггером при регистрации (миграция 20260213052625_v3_profiles_trigger_on_auth_signup.sql).

2.4 Фильтры на карте по категориям
Зачем
Сейчас все вайбы на карте одинаковые. Фильтрация по типу (кофе, спорт, вечеринка) увеличивает релевантность и удержание.
Что реализовать
•	Панель фильтров внизу карты: теги с эмодзи (☕ Кофе, ⚽ Спорт, 🍻 Вечеринка, 🎲 Игры)
•	Цветные маркеры на карте по типу вайба (поле mood в таблице parties)
•	Фильтрация на клиенте по уже загруженным вайбам (без перезапроса)
Файл: features/map/VibeMap.tsx

2.5 Таймер жизни вайба
Зачем
Вайбы имеют expires_at в БД, но на карте это не отображается. Показ таймера создаёт FOMO (синдром упущенной выгоды) и стимулирует быстрее принять решение.
Что реализовать
•	На маркере карты: бейдж 'осталось 2ч'
•	В карточке вайба: обратный отсчёт с обновлением каждую минуту
•	Когда expires_at < 30 минут — красный цвет таймера
•	Клиентский компонент CountdownTimer принимает expires_at: string
Итоговая таблица — Фаза 2
Задача	Статус	Файл/путь
Регенерация types/supabase.ts	⏳ Нужно сделать	types/supabase.ts
Убрать as any после регенерации	⏳ Нужно сделать	PartyChat.tsx, route.ts
Подключить PartyChat к карточке вайба	⏳ Нужно сделать	features/chat/PartyChat.tsx
Проверить Realtime в Supabase Dashboard	⏳ Нужно сделать	Supabase Dashboard
Страница профиля	⏳ Нужно сделать	app/profile/page.tsx
Фильтры на карте	⏳ Нужно сделать	features/map/VibeMap.tsx
Таймер жизни вайба	⏳ Нужно сделать	components/countdown-timer.tsx
 
3. Фаза 3 — Визуал и UX
Цель: поднять ощущение продукта до уровня нативного Telegram-приложения. Framer Motion уже установлен, нужно его использовать.
3.1 Framer Motion — анимации
•	Bottomsheet для карточки вайба: drag-to-dismiss, spring анимация
•	Анимация появления маркеров на карте (stagger)
•	Кнопка JoinVibeButton: scale + haptic feedback через Telegram.WebApp.HapticFeedback
•	AnimatePresence уже используется в PartyChat.tsx — распространить на другие элементы
3.2 Тёмная / светлая тема
•	Переключатель темы уже есть в проекте, нужно доделать
•	Адаптировать Яндекс.Карту под тему: светлая карта для light mode, тёмная для dark
•	Telegram.WebApp.colorScheme определяет тему при запуске
3.3 UI polish карточки вайба
•	Аватарки участников (стек из 3-5 кружков) с счётчиком +N
•	Тег настроения (mood) с эмодзи и цветом
•	Расстояние до вайба в метрах/км
•	Skeleton-заглушки при загрузке
3.4 Loading и skeleton states
•	Скелетон при загрузке списка вайбов
•	Пульсирующие маркеры пока данные грузятся
•	Spinner в чате при отправке сообщения (уже есть) — проверить на мобильных
Итоговая таблица — Фаза 3
Задача	Статус	Файл/путь
Bottomsheet анимация карточки	⏳ Нужно сделать	features/parties/VibeCard.tsx
HapticFeedback на кнопках	⏳ Нужно сделать	components/join-vibe-button.tsx
Адаптация карты под тему	⏳ Нужно сделать	features/map/VibeMap.tsx
Аватарки участников вайба	⏳ Нужно сделать	features/parties/VibeCard.tsx
Skeleton states	⏳ Нужно сделать	components/skeletons/
 
4. Фаза 4 — Рост и вирусность
Цель: механики удержания и вирального роста. Начинать только после первых живых пользователей и обратной связи от них.
4.1 Telegram Bot уведомления
Подключить Telegram Bot API для push-уведомлений в личку:
•	'Вашу заявку на вайб приняли!'
•	'Рядом с вами (500м) создали новую тусовку'
•	'Вайб начнётся через 30 минут'
Реализация: Supabase Edge Function слушает изменения в party_requests и отправляет сообщение через Bot API.
4.2 Система репутации (Karma)
После завершения вайба участники оценивают друг друга. Поле reputation в таблице profiles уже есть (базовое значение 10).
•	Бейджи: 'Душа компании' (+5), 'Хороший гость' (+2), 'Не явился' (-2)
•	Фильтрация пользователей с репутацией < 3 от новых заявок
•	Отображение репутации на карточке профиля
4.3 Deep-link на такси
Кнопка 'Поехать' в карточке вайба открывает Яндекс.Go с координатами назначения:
yandextaxi://route?end-lat=55.7558&end-lon=37.6173&appmetrica_tracking_id=...
Fallback: если Яндекс.Go не установлен — открывать Яндекс.Карты в браузере.
4.4 Аналитика и метрики
•	Telegram WebApp.sendData для передачи событий в бота
•	Supabase Edge Function для логирования ключевых событий
•	Метрики: join_rate, chat_messages_per_vibe, vibe_completion_rate
Итоговая таблица — Фаза 4
Задача	Статус	Файл/путь
Telegram Bot уведомления	⏳ Нужно сделать	supabase/functions/notify-bot/
Система репутации и бейджи	⏳ Нужно сделать	app/api/reputation/route.ts
Deep-link на такси	⏳ Нужно сделать	components/taxi-button.tsx
Аналитика событий	⏳ Нужно сделать	supabase/functions/analytics/
 
5. Важные ограничения и соглашения
Именование
В проекте используются оба термина: 'vibe' (в URL, компонентах) и 'party' (в таблицах БД, API). Это НЕ два разных объекта — это одно и то же. Причина: БД создавалась с термином 'party', фронтенд — с 'vibe'. При создании новых файлов держаться схемы:
•	Таблицы БД и API routes: party / parties
•	UI компоненты и страницы: vibe / vibes
Авторизация
Весь доступ через Supabase Auth. Клиентский код использует createClient() из @/lib/supabase/client. Серверный (API routes, Server Components) — из @/lib/supabase/server. Не путать.
E2E шифрование в чате
Сервер НИКОГДА не видит plaintext сообщений. В таблице messages хранятся только ciphertext и nonce. Поле content оставлено для совместимости (nullable) но не используется. Не добавлять plaintext поля в messages API.
RLS политики
Все таблицы защищены Row Level Security. Если запрос возвращает пустой массив вместо данных — скорее всего проблема в RLS, а не в коде. Проверять в Supabase Dashboard → Authentication → Policies.
Telegram Mini App специфика
•	Telegram.WebApp доступен только внутри Mini App, не в браузере
•	Для тестирования в браузере использовать NEXT_PUBLIC_DEV_TEST_MODE=true в .env
•	Cookies должны быть SameSite=None; Secure; Partitioned (уже настроено в middleware)
•	X-Frame-Options нельзя ставить DENY — сломает Mini App

