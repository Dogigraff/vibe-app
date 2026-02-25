import { Telegraf } from "telegraf";
import "dotenv/config";

const token = process.env.BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL || "https://vibe-app-mu.vercel.app";

if (!token) {
  console.error("BOT_TOKEN is required. Create .env with BOT_TOKEN=...");
  process.exit(1);
}

const bot = new Telegraf(token);

const HELP_TEXT = `VIBE — геосоциальная сеть. Как это работает:

1. Открой приложение (кнопка ниже)
2. Включи геолокацию
3. Создай vibe или смотри активные рядом
4. Стучись к интересным — общайся в чате

Всё происходит за 5 минут. Без регистраций вне Telegram.`;

bot.start(async (ctx) => {
  await ctx.reply(
    "VIBE — найди людей рядом за 5 минут.\n\nНажми кнопку ниже.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть VIBE",
              web_app: { url: webappUrl },
            },
          ],
          [
            { text: "Как работает", callback_data: "how_it_works" },
            { text: "Поделиться", callback_data: "share" },
          ],
        ],
      },
    }
  );
});

bot.help(async (ctx) => {
  await ctx.reply(HELP_TEXT, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Открыть VIBE",
            web_app: { url: webappUrl },
          },
        ],
      ],
    },
  });
});

bot.action("how_it_works", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(HELP_TEXT);
});

bot.action("share", async (ctx) => {
  await ctx.answerCbQuery();
  const botInfo = await bot.telegram.getMe();
  const username = botInfo.username || "vibe_bot";
  await ctx.reply(
    `Поделиться VIBE с друзьями:\n\nОтправь им ссылку на бота:\nhttps://t.me/${username}\n\nИли открой бота и нажми «Поделиться» в меню — выбери чат.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть VIBE",
              web_app: { url: webappUrl },
            },
          ],
        ],
      },
    }
  );
});

bot.launch().then(() => {
  console.log("VIBE bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
