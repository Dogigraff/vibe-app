VIBE
Геосоциальная сеть — Telegram Mini App
Технический план разработки v2.0
Документ для Antigravity — контекст + статус + следующие шаги

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Яндекс.Карты · Framer Motion
Обновлено: Март 2026 · Сборка: ✅ npx next build — 0 ошибок, 21 страница
 
0. Контекст проекта
VIBE — Telegram Mini App, геосоциальная сеть реального времени. Пользователь открывает приложение через Telegram, видит карту с активными вайбами (тусовками) поблизости, стучится на вступление, попадает в E2E-зашифрованный чат участников.
Слоган: «Не будь один. Найди свой вайб за 5 минут.»
Соглашения по именованию — ВАЖНО
⚠ В проекте два термина для одного объекта: 'vibe' (фронтенд, URL, компоненты) и 'party' (таблицы БД, API routes). Это НЕ разные сущности — это исторически сложившееся.
•	Таблицы БД и API routes → party / parties / party_members
•	UI компоненты, страницы, пользовательские тексты → vibe / vibes
Стек технологий
•	Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
•	Supabase (Auth SSR, Postgres + PostGIS, Realtime, RLS, Edge Functions)
•	Яндекс.Карты (@pbe/react-yandex-maps) + Framer Motion
•	E2E шифрование: WebCrypto API (AES-GCM), ключи в Supabase
Структура базы данных
•	profiles — профили (username, avatar_url, bio, tags[], reputation, is_verified)
•	parties — вайбы (location geography, mood, description, expires_at, status, is_boosted)
•	party_members — участники (role: host/guest)
•	party_requests — заявки на вступление (status: pending/rejected)
•	messages — чат (ciphertext, nonce, e2e_version, sender_device_id) — без plaintext
•	user_devices — публичные ключи устройств для E2E
•	party_room_keys — зашифрованные AES-ключи комнат
ℹ Все таблицы защищены Row Level Security (RLS). Пустой ответ вместо данных = проблема RLS, не код. Проверять в Supabase Dashboard → Authentication → Policies.
Авторизация — правила использования клиентов
•	Клиентский код (компоненты, 'use client') → createClient() из @/lib/supabase/client
•	Серверный код (API routes, Server Components) → createClient() из @/lib/supabase/server
⚠ Не путать импорты. Серверный клиент имеет сессию пользователя через cookies. Клиентский — через браузерные токены.
Тестирование без Telegram
В .env установить NEXT_PUBLIC_DEV_TEST_MODE=true — это активирует FakeMap и отключает проверку авторизации в middleware. Для продакшна убрать этот флаг.

 
1. Фаза 1 — Фундамент ✅ Закрыта
Все задачи выполнены. Сборка проходит без ошибок.
Сводная таблица
Задача	Статус	Файл/путь
Лендинг SSR + метатеги на русском	✅ Готово	app/page.tsx
CSP и заголовки безопасности	✅ Готово	next.config.js
sitemap.ts	✅ Готово	app/sitemap.ts
robots.ts	✅ Готово	app/robots.ts
Favicon (icon.svg)	✅ Готово	app/icon.svg
OG-image (ImageResponse)	✅ Готово	app/opengraph-image.tsx
JoinVibeButton компонент	✅ Готово	components/join-vibe-button.tsx
API /api/vibes/join (POST)	✅ Готово	app/api/vibes/join/route.ts
lang='ru' в layout.tsx	✅ Готово	app/layout.tsx
JSON-LD Schema.org на русском	✅ Готово	app/layout.tsx
Ключевые решения принятые в Фазе 1
X-Frame-Options — почему не добавляем
Telegram открывает Mini App во фрейме. X-Frame-Options: DENY или SAMEORIGIN сломают приложение. Вместо него используется директива frame-ancestors в CSP, которая разрешает встраивание только с telegram.org доменов.
as any в API route — временное решение
В app/api/vibes/join/route.ts используется (supabase as any) для обращения к таблице vibe_participants, потому что types/supabase.ts не содержит эту таблицу. После регенерации типов (Фаза 2, п. 2.1) убрать.
.maybeSingle() вместо .single()
Supabase .single() бросает ошибку PGRST116 если строка не найдена. .maybeSingle() возвращает null — это корректное поведение когда пользователь ещё не подавал заявку на вайб.
 
2. Фаза 2 — Ядро продукта 🔄 Почти закрыта
Большинство задач выполнено. Осталось два блокера связанных с Supabase.
Сводная таблица
Задача	Статус	Файл/путь
PartyChat подключён к карточке вайба	✅ Готово	features/map/VibeMap.tsx
Фильтры на карте (6 категорий)	✅ Готово	features/map/VibeMap.tsx
Цветные маркеры по типу вайба	✅ Готово	features/map/VibeMap.tsx
CountdownTimer компонент	✅ Готово	components/countdown-timer.tsx
Страница профиля (view)	✅ Готово	app/(root)/profile/page.tsx
Редактирование bio и тегов	✅ Готово	features/profile/ProfileView.tsx
Последние 5 вайбов на профиле	✅ Готово	features/profile/ProfileView.tsx
Бейджи репутации	✅ Готово	features/profile/ProfileView.tsx
Регенерация types/supabase.ts	⛔ Блокер	types/supabase.ts
Убрать as any после регенерации	⛔ Блокер	PartyChat.tsx, route.ts
Включить Realtime в Supabase Dashboard	⛔ Блокер	Supabase Dashboard
2.1 ⛔ Блокер — Регенерация types/supabase.ts
Что произошло
При попытке регенерации типов через npx supabase gen types > types/supabase.ts файл был опустошён (команда перезаписала файл пустым выводом из-за отсутствия логина). Файл восстановлен вручную, но новые E2E поля всё ещё отсутствуют.
Что нужно сделать
Шаг 1: залогиниться в Supabase CLI:
npx supabase login
Шаг 2: скопировать Project ID из NEXT_PUBLIC_SUPABASE_URL в .env:
# Если URL = https://abcdefgh.supabase.co
# То PROJECT_ID = abcdefgh
Шаг 3: сгенерировать типы:
npx supabase gen types typescript --project-id ВАШ_PROJECT_ID > types/supabase.ts
⚠ НЕ запускать команду без project-id — перезапишет файл пустым выводом снова.
Что должно появиться в types/supabase.ts после
В блоке messages → Row должны быть:
•	ciphertext: string | null
•	nonce: string | null
•	e2e_version: number
•	sender_device_id: string | null
Также должны появиться таблицы: user_devices, party_room_keys, vibe_participants (если она есть в БД).
2.2 ⛔ Блокер — Realtime для таблицы messages
Что нужно сделать вручную в Supabase Dashboard
Зайти в Supabase Dashboard → Database → Replication → Source tables.
Найти таблицу messages и включить для неё Realtime (переключить тумблер).
⚠ Без этого PartyChat.tsx будет получать новые сообщения только при перезагрузке страницы, а не в реальном времени.
ℹ PartyChat использует supabase.channel('party-chat-{id}').on('postgres_changes', ...) — это работает только если Realtime включён для таблицы на стороне Supabase.
2.3 Что делать после снятия блокеров
После регенерации types/supabase.ts убрать все временные 'as any':
•	features/chat/PartyChat.tsx — строки с supabase.schema('public') as any
•	app/api/parties/messages/route.ts — строки с messagesTable as any
•	app/api/vibes/join/route.ts — строки с (supabase as any).from(...)
После удаления as any TypeScript покажет реальные ошибки типизации если они есть — исправлять по месту.
 
3. Фаза 3 — Визуал и UX ✅ Закрыта
Сводная таблица
Задача	Статус	Файл/путь
Bottomsheet spring-анимация карточки вайба	✅ Готово	features/map/VibeMap.tsx
AnimatePresence для появления/исчезновения	✅ Готово	features/map/VibeMap.tsx
Переключатель темы (Sun/Moon)	✅ Готово	components/shared/ThemeToggle.tsx
Приоритет темы: Telegram → localStorage → system	✅ Готово	components/shared/ThemeToggle.tsx
Градиентный логотип VIBE в Header	✅ Готово	components/shared/Header.tsx
BottomNav с иконками Lucide	✅ Готово	components/shared/BottomNav.tsx
Backdrop-blur в Header и BottomNav	✅ Готово	компоненты выше
Расстояние до вайба в карточке	✅ Готово	features/map/VibeMap.tsx
Компактный CountdownTimer на маркере	✅ Готово	components/countdown-timer.tsx
Цветные бейджи mood в карточке	✅ Готово	features/map/VibeMap.tsx
Локализация: lang='ru', все тексты на русском	✅ Готово	app/layout.tsx
Детали реализации
Анимация карточки вайба
motion.div с параметрами: initial={{ y: 200, opacity: 0 }}, animate={{ y: 0, opacity: 1 }}, transition={{ type: 'spring', damping: 25, stiffness: 300 }}. Карточка выезжает снизу с пружинным эффектом.
Логика темы
ThemeToggle проверяет при монтировании: 1) Telegram.WebApp.colorScheme, 2) localStorage 'vibe-theme', 3) prefers-color-scheme медиазапрос. Управляет классом 'dark' на html элементе.
Фильтры на карте
6 категорий: ✨ Все, 🍻 Вечеринка, ☕ Кофе, ⚽ Спорт, 🎲 Игры, 🎭 Культура. Фильтрация на клиенте по уже загруженным данным без перезапроса к API. Цвет маркера на карте соответствует категории через iconColor в Яндекс.Картах.
 
4. Фаза 4 — Рост и вирусность ⏳ После первых пользователей
Эту фазу начинать только после того как приложение работает в продакшне и есть первые реальные пользователи с обратной связью.
4.1 Регенерация типов Supabase — финальный шаг перед Фазой 4
Перед началом Фазы 4 обязательно закрыть блокеры из Фазы 2 (регенерация типов и Realtime).
4.2 Telegram Bot уведомления
Зачем
Основной виральный механизм. Уведомление в личку значительно лучше удерживает пользователей чем любой in-app.
Что реализовать
•	'Вашу заявку на вайб приняли!' — при смене party_requests.status на accepted
•	'Рядом с вами создали новый вайб' — геофенсинг, триггер при INSERT в parties
•	'Вайб начнётся через 30 минут' — cron job по expires_at
Реализация
Supabase Edge Function (Deno) слушает webhook от Database Trigger и отправляет запрос к Telegram Bot API. Bot Token хранить в Supabase Secrets.
supabase/functions/notify-bot/index.ts
4.3 Система репутации
Логика начисления
Поле reputation в таблице profiles уже существует (базовое значение 10). Правила:
•	+1 — посетил вайб (party_members, role=guest, вайб завершился)
•	+5 — провёл вайб как хост с 2+ гостями
•	-5 — получил репутационный репорт
•	-2 — не явился (party_requests.status = no_show)
Бейджи уже готовы
В ProfileView.tsx функция getReputationLabel() уже реализована: Новичок (10), Активный (20), Душа компании (30), Легенда (50+). Осталось добавить API для изменения репутации.
4.4 Deep-link на такси
Реализация
Кнопка в карточке вайба. Если Яндекс.Go установлен — открывает deep-link с координатами. Если нет — fallback на Яндекс.Карты в браузере.
yandextaxi://route?end-lat=55.7558&end-lon=37.6173
// Fallback:
https://maps.yandex.ru/?rtext=~55.7558,37.6173&rtt=taxi
Файл: components/taxi-button.tsx
4.5 Аналитика
•	Ключевые события для трекинга: vibe_opened, join_clicked, join_success, chat_message_sent, vibe_created
•	Реализация через Supabase Edge Function или Telegram.WebApp.sendData
•	Хранить в отдельной таблице events (user_id, event_name, metadata, created_at)
Таблица Фазы 4
Задача	Статус	Файл/путь
Telegram Bot уведомления	⏳ Нужно сделать	supabase/functions/notify-bot/
API изменения репутации	⏳ Нужно сделать	app/api/reputation/route.ts
Кнопка 'Поехать' (такси)	⏳ Нужно сделать	components/taxi-button.tsx
Аналитика событий	⏳ Нужно сделать	supabase/functions/analytics/
Таблица events в БД	⏳ Нужно сделать	supabase/migrations/...events.sql
 
5. Текущие блокеры — что нужно сделать прямо сейчас
Блокер 1 — npx supabase login + регенерация типов
⚠ Критично. Без этого TypeScript не знает E2E поля таблицы messages. Весь код чата работает через as any.
Пошаговая инструкция:
1. Открыть терминал в корне проекта
npx supabase login
2. Откроется браузер с Supabase — войти, скопировать Access Token
3. Найти Project ID в .env (часть URL до .supabase.co):
# NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXX.supabase.co
# PROJECT_ID = XXXXXXXX
4. Сгенерировать типы (с явным project-id!):
npx supabase gen types typescript --project-id XXXXXXXX > types/supabase.ts
5. Проверить что в types/supabase.ts в блоке messages появились: ciphertext, nonce, e2e_version, sender_device_id
Блокер 2 — Realtime в Supabase Dashboard
⚠ Без этого чат не работает в реальном времени — только при перезагрузке.
1. Открыть Supabase Dashboard → выбрать проект
2. Перейти в Database → Replication
3. Найти таблицу 'messages' в списке Source tables
4. Включить переключатель напротив messages
5. Сохранить изменения
После снятия блокеров — убрать as any
Отправить Antigravity такой запрос:
ℹ «Типы Supabase перегенерированы. Убери все as any из: features/chat/PartyChat.tsx, app/api/parties/messages/route.ts, app/api/vibes/join/route.ts. Используй правильные типы из Database['public']['Tables'].»
 
6. Архитектурные заметки для Antigravity
E2E шифрование — главное правило
⚠ Сервер НИКОГДА не должен видеть plaintext сообщений. В API нельзя добавлять поле content в messages.
Схема работы чата:
•	Клиент генерирует AES-GCM ключ комнаты (party_room_keys)
•	Каждое сообщение шифруется этим ключом → ciphertext + nonce
•	Сервер хранит только ciphertext и nonce, расшифровывает только клиент
•	Ключи устройств (ECDH) хранятся в user_devices для обмена ключами комнаты
RLS — почему запросы возвращают пустые данные
Если Supabase запрос возвращает [] или null вместо данных — почти всегда это RLS, не баг в коде. Алгоритм отладки:
•	1. Проверить Supabase Dashboard → Authentication → Policies для нужной таблицы
•	2. Проверить что пользователь залогинен (auth.getUser() возвращает user)
•	3. Проверить что запрос идёт от правильного клиента (server vs client)
•	4. Временно отключить RLS в Dashboard для таблицы (для отладки) и проверить
Telegram Mini App — особенности
•	Telegram.WebApp доступен только внутри Mini App. В браузере = undefined
•	Для тестирования: NEXT_PUBLIC_DEV_TEST_MODE=true активирует FakeMap
•	Cookies обязательно: SameSite=None; Secure; Partitioned (настроено в lib/supabase/middleware.ts)
•	HapticFeedback: Telegram.WebApp.HapticFeedback.impactOccurred('medium') — для кнопок
•	Тема: Telegram.WebApp.colorScheme — 'light' или 'dark' (ThemeToggle уже использует)
Структура папок проекта
•	app/ — Next.js App Router страницы и API routes
•	app/(root)/ — защищённые страницы (map, profile) — layout с Header + BottomNav
•	components/ — переиспользуемые компоненты (join-vibe-button, countdown-timer)
•	components/shared/ — Header, BottomNav, ThemeToggle
•	features/ — бизнес-логика по доменам: chat/, map/, parties/, profile/, security/
•	lib/supabase/ — client.ts, server.ts, middleware.ts
•	lib/crypto/ — E2E шифрование: keys.ts, room-key.ts, message.ts, store.ts
•	supabase/migrations/ — SQL миграции в хронологическом порядке
•	types/ — supabase.ts (авто), db.ts (кастомные типы)
Документ актуален на момент: ✅ build — 0 ошибок · Фазы 1, 3 закрыты · Фаза 2 — 2 блокера · Фаза 4 — после первых пользователей
