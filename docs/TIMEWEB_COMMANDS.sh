#!/bin/bash
# Выполняй эти команды по очереди на сервере (после ssh root@72.56.108.225)

# 1. Обновить систему
sudo apt update && sudo apt upgrade -y

# 2. Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Git и PM2
sudo apt install -y git
sudo npm install -g pm2

# 4. Развернуть бота
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/Dogigraff/vibe-app.git
cd vibe-app/bot

# 5. Зависимости
npm install

# 6. Создать .env (вставь свой BOT_TOKEN!)
# cp .env.example .env
# nano .env

# 7. Запуск
# pm2 start index.js --name vibe-bot
# pm2 startup
# pm2 save
