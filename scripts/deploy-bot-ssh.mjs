#!/usr/bin/env node
/**
 * Деплой Telegram-бота на сервер по SSH.
 * Использование:
 *   DEPLOY_SSH_HOST=72.56.108.225 DEPLOY_SSH_USER=root DEPLOY_SSH_PASS=xxx DEPLOY_BOT_TOKEN=xxx node scripts/deploy-bot-ssh.mjs
 * Или создать scripts/deploy.env (в .gitignore!) с переменными.
 */

import { Client } from "ssh2";
import { createConnection } from "net";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

function checkPort(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, timeoutMs);
    const sock = createConnection(port, host, () => {
      clearTimeout(t);
      sock.end();
      resolve(true);
    });
    sock.on("error", () => {
      clearTimeout(t);
      resolve(false);
    });
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// Загрузить deploy.env если есть
const deployEnvPath = join(__dirname, "deploy.env");
if (existsSync(deployEnvPath)) {
  const content = readFileSync(deployEnvPath, "utf8").replace(/\r\n/g, "\n");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key) process.env[key] = val;
    }
  }
}

const HOST = process.env.DEPLOY_SSH_HOST || "72.56.108.225";
const USER = process.env.DEPLOY_SSH_USER || "root";
const PASS = process.env.DEPLOY_SSH_PASS;
let BOT_TOKEN = process.env.DEPLOY_BOT_TOKEN;
if (!BOT_TOKEN) {
  const botEnvPath = join(__dirname, "..", "bot", ".env");
  if (existsSync(botEnvPath)) {
    const m = readFileSync(botEnvPath, "utf8").match(/BOT_TOKEN=(.+)/);
    if (m) BOT_TOKEN = m[1].trim();
  }
}
if (!BOT_TOKEN) {
  const rootEnvPaths = [".env", ".env.local"].map((p) => join(__dirname, "..", p));
  for (const p of rootEnvPaths) {
    if (existsSync(p)) {
      const c = readFileSync(p, "utf8");
      const m = c.match(/TELEGRAM_BOT_TOKEN=(.+)/) || c.match(/BOT_TOKEN=(.+)/);
      if (m && m[1].trim() && !m[1].includes("...")) BOT_TOKEN = m[1].trim();
      if (BOT_TOKEN) break;
    }
  }
}

if (!PASS) {
  console.error("Ошибка: задай DEPLOY_SSH_PASS (пароль SSH)");
  process.exit(1);
}
if (!BOT_TOKEN) {
  console.error("Ошибка: задай DEPLOY_BOT_TOKEN (токен бота от @BotFather)");
  process.exit(1);
}

function runCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream
        .on("close", (code) => resolve({ code, out }))
        .on("data", (d) => {
          out += d.toString();
          process.stdout.write(d.toString());
        })
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  });
}

async function main() {
  console.log("Проверка доступа к", HOST + ":22...");
  const portOpen = await checkPort(HOST, 22);
  if (!portOpen) {
    console.error(
      "\nОшибка: сервер", HOST, "недоступен (порт 22 закрыт или не отвечает).\n" +
      "Проверь: 1) VPS включён в панели Timeweb  2) SSH включён  3) Файрвол разрешает порт 22"
    );
    process.exit(1);
  }
  console.log("Порт 22 открыт, подключаюсь по SSH...");

  const conn = new Client();
  const connectOpts = {
    host: HOST,
    port: 22,
    username: USER,
    password: PASS,
    readyTimeout: 90000,
    tryKeyboard: true,
  };
  if (process.env.DEPLOY_DEBUG) {
    connectOpts.debug = (msg) => process.stderr.write("[SSH] " + msg + "\n");
  }
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect(connectOpts);
  });

  console.log("Подключено к", HOST);

  const WEBAPP_URL = "https://vibe-app-woad.vercel.app";
  const envContent = `BOT_TOKEN=${BOT_TOKEN}
WEBAPP_URL=${WEBAPP_URL}
`;
  const envB64 = Buffer.from(envContent).toString("base64");

  const cmds = [
    "sudo apt update -qq && sudo apt install -y curl git",
    'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
    "sudo apt install -y nodejs",
    "sudo npm install -g pm2",
    "mkdir -p ~/apps && cd ~/apps && rm -rf vibe-app && git clone --depth 1 https://github.com/Dogigraff/vibe-app.git",
    "cd ~/apps/vibe-app/bot && npm install",
  ];

  for (const cmd of cmds) {
    const { code } = await runCommand(conn, cmd);
    if (code !== 0) {
      console.error("Команда завершилась с кодом", code);
      conn.end();
      process.exit(1);
    }
  }

  // Создать .env (base64 чтобы избежать экранирования)
  await runCommand(
    conn,
    `cd ~/apps/vibe-app/bot && echo ${envB64} | base64 -d > .env`
  );

  // Запуск
  await runCommand(conn, "cd ~/apps/vibe-app/bot && pm2 delete vibe-bot 2>/dev/null; pm2 start index.js --name vibe-bot");
  await runCommand(conn, "pm2 save && pm2 startup 2>/dev/null || true");

  const { out } = await runCommand(conn, "pm2 logs vibe-bot --lines 5 --nostream");
  console.log("\n--- Логи бота ---\n", out);

  conn.end();
  console.log("\nГотово. Бот запущен на", HOST);
}

function printManualDeploy() {
  const WEBAPP_URL = "https://vibe-app-woad.vercel.app";
  console.error(`
═══════════════════════════════════════════════════════════════
  SSH-подключение не установилось (сервер закрывает соединение).
  Возможные причины: fail2ban, блокировка по IP, несовместимость.

  РУЧНОЙ ДЕПЛОЙ:
  1. Подключись: ssh root@${HOST}
  2. Выполни на сервере (подставь свой BOT_TOKEN):

     export BOT_TOKEN='твой_токен_от_BotFather'
     export WEBAPP_URL='${WEBAPP_URL}'
     sudo apt update && sudo apt install -y curl git
     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     sudo apt install -y nodejs && sudo npm install -g pm2
     mkdir -p ~/apps && cd ~/apps && rm -rf vibe-app && git clone --depth 1 https://github.com/Dogigraff/vibe-app.git
     cd vibe-app/bot && npm install
     echo "BOT_TOKEN=\$BOT_TOKEN" > .env && echo "WEBAPP_URL=\$WEBAPP_URL" >> .env
     pm2 delete vibe-bot 2>/dev/null; pm2 start index.js --name vibe-bot
     pm2 save && pm2 startup

  Скрипт для копирования: scripts/deploy-bot-manual.sh
═══════════════════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.message && (err.message.includes("Connection lost") || err.message.includes("handshake"))) {
    printManualDeploy();
  }
  process.exit(1);
});
