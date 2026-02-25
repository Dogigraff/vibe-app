"use client";

const BOT_LINK =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK ||
  "https://t.me/vibe_aurapp_bot?start=vibe";

export function OpenInTelegram() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const wa =
      typeof window !== "undefined"
        ? (window.Telegram?.WebApp as { openTelegramLink?: (url: string) => void } | undefined)
        : undefined;
    if (wa?.openTelegramLink) {
      e.preventDefault();
      wa.openTelegramLink(BOT_LINK);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Откройте VIBE через Telegram</h1>
        <p className="text-sm text-muted-foreground">
          Откройте приложение через Telegram Desktop или телефон. Telegram Web
          может не поддерживать авторизацию.
        </p>
        <a
          href={BOT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="inline-flex items-center justify-center rounded-md bg-[#0088cc] px-4 py-3 text-sm font-medium text-white hover:bg-[#007ab8]"
        >
          Открыть в Telegram
        </a>
      </div>
    </main>
  );
}
