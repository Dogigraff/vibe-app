#!/bin/bash
# Деплой бота — выполнить на сервере после: ssh root@72.56.108.225
# Или: скопировать команды ниже и вставить в терминал.

set -e
BOT_TOKEN="${BOT_TOKEN:-ЗАМЕНИ_НА_ТОКЕН_ОТ_BOTFATHER}"
WEBAPP_URL="${WEBAPP_URL:-https://vibe-app-woad.vercel.app}"

echo "Установка зависимостей..."
sudo apt update -qq && sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

echo "Клонирование и настройка бота..."
mkdir -p ~/apps && cd ~/apps
rm -rf vibe-app
git clone --depth 1 https://github.com/Dogigraff/vibe-app.git
cd vibe-app/bot
npm install

echo "BOT_TOKEN=$BOT_TOKEN" > .env
echo "WEBAPP_URL=$WEBAPP_URL" >> .env

echo "Запуск PM2..."
pm2 delete vibe-bot 2>/dev/null || true
pm2 start index.js --name vibe-bot
pm2 save
pm2 startup 2>/dev/null || true

echo "Готово. Логи:"
pm2 logs vibe-bot --lines 5 --nostream
