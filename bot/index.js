import { Telegraf, Markup } from "telegraf";
import "dotenv/config";

const token = process.env.BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL || "https://vibe-app-mu.vercel.app";
const DEEPLINK = "https://t.me/vibe_aurapp_bot?start=vibe";

if (!token) {
  console.error("BOT_TOKEN is required. Create bot/.env with BOT_TOKEN=...");
  process.exit(1);
}

const bot = new Telegraf(token);

const HELP_TEXT = `Как это работает:

1. Открой приложение (кнопка ниже)
2. Включи геолокацию
3. Создай vibe или смотри активные рядом
4. Общайся в чате — всё за 5 минут.`;

const openVibeKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.webApp("Открыть VIBE", webappUrl)],
  ]);

bot.start(async (ctx) => {
  await ctx.reply(
    "VIBE — найди людей рядом за 5 минут.\nНажми кнопку ниже, чтобы открыть Mini App.",
    Markup.inlineKeyboard([
      [Markup.button.webApp("Открыть VIBE", webappUrl)],
      [
        Markup.button.callback("Как работает", "how"),
        Markup.button.callback("Поделиться", "share"),
      ],
    ])
  );
});

bot.help(async (ctx) => {
  await ctx.reply(HELP_TEXT, openVibeKeyboard());
});

bot.action("how", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(HELP_TEXT, openVibeKeyboard());
});

bot.action("share", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `Ссылка для друзей:\n${DEEPLINK}`,
    Markup.inlineKeyboard([
      [Markup.button.url("Открыть ссылку", DEEPLINK)],
    ])
  );
});

async function main() {
  await bot.telegram.deleteWebhook({ drop_pending_updates: true });
  await bot.launch();
  console.log("BOT RUNNING");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
