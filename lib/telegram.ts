import type { TelegramUser } from "@/types/telegram";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        disableVerticalSwipes: () => void;
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
        };
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}

export function isTelegramWebApp(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Telegram?.WebApp !== "undefined";
}

export function getTelegramUser(): TelegramUser | null {
  if (!isTelegramWebApp()) return null;
  return window.Telegram!.WebApp.initDataUnsafe?.user ?? null;
}

export function getTelegramInitData(): string | null {
  if (!isTelegramWebApp()) return null;
  const data = window.Telegram!.WebApp.initData;
  return data && data.length > 0 ? data : null;
}

export function initTelegramWebApp(): void {
  if (!isTelegramWebApp()) return;

  const tg = window.Telegram!.WebApp;
  tg.ready();

  if (tg.expand) {
    tg.expand();
  }
  if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
  }
}
