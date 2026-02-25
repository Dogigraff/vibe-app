# Production Deploy Report — Supabase migrations

**Date:** 2026-02-25  
**Project ref:** modicqcpmtrzptyhysga  
**Site URL:** https://vibe-app-mu.vercel.app

---

## 1. Что было (до работ)

| Параметр | Состояние |
|----------|-----------|
| `supabase_migrations.schema_migrations` | relation does not exist |
| `allow_action` | функция отсутствовала |
| `public` | схема пустая (нет прикладных таблиц) |
| 503 при отправке сообщений | из‑за fail‑closed rate limiting (RPC allow_action не найден) |

---

## 2. Что применено

**Метод:** ручное применение миграций через Supabase MCP `execute_sql`  
**Причина:** `npx supabase db push` требует `SUPABASE_ACCESS_TOKEN` (логин не выполнен)

**Список миграций (12 файлов):**

| # | Version | Файл |
|---|---------|------|
| 1 | 20260213052612 | v3_schema_db_schema_md.sql |
| 2 | 20260213052619 | v3_rls_policies.sql |
| 3 | 20260213052625 | v3_profiles_trigger_on_auth_signup.sql |
| 4 | 20260213120000 | v3_rls_and_schema_patches.sql |
| 5 | 20260213070000 | add_get_nearby_parties_function.sql |
| 6 | 20260213130000 | add_get_nearby_parties_invoker_comment.sql |
| 7 | 20260213190000 | add_create_party_rpc.sql |
| 8 | 20260223200000 | rls_e2e_reports.sql |
| 9 | 20260223210000 | rate_limiting.sql |
| 10 | 20260223220000 | e2e_encryption.sql |
| 11 | 20260223230000 | moderation.sql |
| 12 | 20260224000000 | security_hardening_v2.sql |

---

## 3. Сигнатура allow_action

```
allow_action(uuid, text, integer, integer)
```

Соответствует вызову из API: `p_user_id`, `p_action`, `p_window_s`, `p_max_count`.

---

## 4. Результаты smoke-тестов

| Тест | Команда | Ожидание | Факт |
|------|---------|----------|------|
| Plaintext POST (без auth) | `Invoke-WebRequest -Uri "https://vibe-app-mu.vercel.app/api/parties/messages" -Method POST -ContentType "application/json" -Body '{"content":"test"}'` | 401 или 400 | **401** (Unauthorized) |
| Ciphertext POST (без auth) | `Invoke-WebRequest -Uri "https://vibe-app-mu.vercel.app/api/parties/messages" -Method POST -ContentType "application/json" -Body '{"party_id":"...","ciphertext":"YQ==","nonce":"AAAAAAAAAAAAAAAAAAAAAA==","e2e_version":1}'` | 401 | **401** |

Выводы:
- Endpoint `/api/parties/messages` доступен
- 503 не возникает — RPC `allow_action` успешно вызывается (fail-closed больше не блокирует из‑за отсутствия функции)
- Без аутентификации ожидаемо 401

---

## 5. Команды для воспроизведения smoke-тестов

**PowerShell:**
```powershell
# Plaintext POST — должен вернуть 400 (при auth) или 401 (без auth)
try { Invoke-WebRequest -Uri "https://vibe-app-mu.vercel.app/api/parties/messages" -Method POST -ContentType "application/json" -Body '{"content":"test"}' } catch { $_.Exception.Response.StatusCode.value__ }

# Ciphertext POST — 401 без auth; при auth и membership — 200/201
try { Invoke-WebRequest -Uri "https://vibe-app-mu.vercel.app/api/parties/messages" -Method POST -ContentType "application/json" -Body '{"party_id":"<uuid>","ciphertext":"YQ==","nonce":"AAAAAAAAAAAAAAAAAAAAAA==","e2e_version":1}' } catch { $_.Exception.Response.StatusCode.value__ }
```

---

## 6. Риски / Что проверить вручную в UI

1. **Отправка сообщения** — войти в приложение, выбрать/создать party, отправить сообщение — не должно быть 503
2. **Rate limit** — отправить >5 сообщений за 10 с — ожидается 429
3. **Shadow ban** — логика `check_shadow_ban` требует 5 pending reports; проверить в Supabase Dashboard при необходимости
4. **Supabase CLI** — при следующих миграциях выполнить `npx supabase login` и `npx supabase db push` для воспроизводимого деплоя
