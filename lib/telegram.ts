import type { TelegramUser } from "@/types/telegram";

/** Insets from Telegram Mini App (Bot API 7.10+). Values in px, CSS pixels. */
export type TelegramInset = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        disableVerticalSwipes: () => void;
        /** Device safe area (notch / home indicator). */
        safeAreaInset?: TelegramInset;
        /** Safe area for web content under native Telegram chrome (header, etc.). */
        contentSafeAreaInset?: TelegramInset;
        requestContentSafeArea?: () => void;
        onEvent?: (eventType: string, callback: () => void) => void;
        offEvent?: (eventType: string, callback: () => void) => void;
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
        };
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

let safeAreaEventsBound = false;
let telegramUiInitialized = false;

/**
 * Publishes Telegram + iOS safe-area values as CSS variables on <html>.
 * - --tg-pad-top / bottom / left / right: best available inset (px) for Mini App layout.
 * Prefer contentSafeAreaInset (учёт шапки Telegram), иначе safeAreaInset.
 */
export function applyTelegramSafeAreaCss(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  const pin = () => {
    const c = tg.contentSafeAreaInset;
    const s = tg.safeAreaInset;
    const top = c?.top ?? s?.top;
    const bottom = c?.bottom ?? s?.bottom;
    const left = c?.left ?? s?.left;
    const right = c?.right ?? s?.right;

    const set = (name: string, v: number | undefined) => {
      if (typeof v === "number" && v >= 0) root.style.setProperty(name, `${v}px`);
      else root.style.removeProperty(name);
    };

    set("--tg-pad-top", top);
    set("--tg-pad-bottom", bottom);
    set("--tg-pad-left", left);
    set("--tg-pad-right", right);
  };

  pin();

  if (!safeAreaEventsBound && tg.onEvent) {
    safeAreaEventsBound = true;
    const onSafe = () => pin();
    tg.onEvent("safeAreaChanged", onSafe);
    tg.onEvent("contentSafeAreaChanged", onSafe);
  }
}

export function initTelegramWebApp(): void {
  if (!isTelegramWebApp()) return;

  const tg = window.Telegram!.WebApp;

  if (!telegramUiInitialized) {
    telegramUiInitialized = true;
    tg.ready();
    tg.expand?.();
    tg.disableVerticalSwipes?.();
    tg.requestContentSafeArea?.();
  }

  applyTelegramSafeAreaCss();
}
