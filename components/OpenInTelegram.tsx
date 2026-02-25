"use client";

import { useState } from "react";

const BOT_LINK =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK ||
  "https://t.me/vibe_aurapp_bot?start=vibe";

export function OpenInTelegram() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(BOT_LINK).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Откройте VIBE через Telegram</h1>
        <p className="text-sm text-muted-foreground">
          Откройте приложение через Telegram Desktop или телефон. Telegram Web
          может не поддерживать авторизацию.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={BOT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-[#0088cc] px-4 py-3 text-sm font-medium text-white hover:bg-[#007ab8]"
          >
            Открыть в Telegram
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Вставь ссылку в поиск Telegram
        </p>
      </div>
    </main>
  );
}
