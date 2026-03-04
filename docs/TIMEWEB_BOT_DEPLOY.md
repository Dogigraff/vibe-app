# Деплой Telegram-бота VIBE на Timeweb Cloud

Пошаговая инструкция для развёртывания бота @vibe_aurapp_bot на VPS Timeweb.

---

## 1. Создать сервер в Timeweb

1. Зайди на [timeweb.cloud](https://timeweb.cloud)
2. **Облачные серверы** → **Создать сервер**
3. Выбери:
   - **ОС:** Ubuntu 22.04 или 24.04
   - **Тариф:** самый дешёвый (1 GB RAM достаточно для бота)
4. Создай сервер и дождись запуска.

---

## 2. Подключиться по SSH

Из панели Timeweb скопируй:
- **IP-адрес** сервера
- **Логин** (часто `root`)
- **Пароль** (или добавь SSH-ключ)

В терминале (PowerShell или PuTTY):

```bash
ssh root@ТВОЙ_IP
```

Введи пароль при запросе.

---

## 3. Установить Node.js 18+

На сервере выполни:

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js 20 (LTS) через NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверить
node -v   # должно быть v20.x
npm -v
```

---

## 4. Установить Git и PM2

```bash
sudo apt install -y git
sudo npm install -g pm2
```

---

## 5. Развернуть бота

```bash
# Создать папку и перейти
mkdir -p ~/apps && cd ~/apps

# Клонировать репо (только нужна папка bot)
git clone https://github.com/Dogigraff/vibe-app.git
cd vibe-app/bot

# Установить зависимости
npm install

# Создать .env
cp .env.example .env
nano .env
```

В `nano .env` заполни:

```
BOT_TOKEN=твой_токен_от_BotFather
WEBAPP_URL=https://твой-проект.vercel.app
```

Сохрани: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 6. Запустить бота через PM2

```bash
# Запуск
pm2 start index.js --name vibe-bot

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save
```

Должно вывести `BOT RUNNING` в логах.

Проверка:

```bash
pm2 status
pm2 logs vibe-bot
```

---

## 7. Проверить

Открой @vibe_aurapp_bot в Telegram и напиши `/start` — бот должен ответить.

---

## Обновление бота

```bash
cd ~/apps/vibe-app
git pull
cd bot
npm install
pm2 restart vibe-bot
```

---

## Полезные команды PM2

| Команда | Описание |
|---------|----------|
| `pm2 status` | Список процессов |
| `pm2 logs vibe-bot` | Логи |
| `pm2 restart vibe-bot` | Перезапуск |
| `pm2 stop vibe-bot` | Остановка |

---

## Переменные

| Переменная | Описание |
|------------|----------|
| `BOT_TOKEN` | Токен от @BotFather (обязательно) |
| `WEBAPP_URL` | URL Mini App (по умолчанию vibe-app-mu.vercel.app) |

---

## Автоматический деплой (скрипт)

Создай `scripts/deploy.env` (в .gitignore!):

```
DEPLOY_SSH_HOST=72.56.108.225
DEPLOY_SSH_USER=root
DEPLOY_SSH_PASS=твой_пароль
DEPLOY_BOT_TOKEN=токен_от_BotFather
```

Запуск: `node scripts/deploy-bot-ssh.mjs`

---

## Ошибка «Connection lost before handshake»

Если скрипт падает с этой ошибкой, сервер закрывает соединение до завершения SSH handshake.

**Что проверить:**

1. **Подключение вручную** — выполни `ssh root@ТВОЙ_IP`. Если работает, проблема может быть в библиотеке ssh2 (некоторые VPS не любят Node.js SSH-клиент).
2. **fail2ban** — на сервере выполни `fail2ban-client status sshd` и при необходимости `fail2ban-client set sshd unbanip ТВОЙ_IP`.
3. **Ручной деплой** — скрипт выведет инструкции. Подключись по SSH и выполни команды вручную (см. `scripts/deploy-bot-manual.sh`).
