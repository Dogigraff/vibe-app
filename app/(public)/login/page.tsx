"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isTelegramWebApp,
  getTelegramInitData,
  getTelegramUser,
} from "@/lib/telegram";

const IS_DEV_TG_MOCK = process.env.NEXT_PUBLIC_DEV_TG_MOCK === "true";
const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "vibe_bot";
const TELEGRAM_BOT_LINK = `https://t.me/${BOT_USERNAME}`;

export default function LoginPage() {
  const router = useRouter();
  const [telegramDetected, setTelegramDetected] = useState<boolean | null>(null);
  const [initDataLength, setInitDataLength] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "mock_loading" | "telegram_web_fallback"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const isTg = isTelegramWebApp();
    setTelegramDetected(isTg);

    const initData = getTelegramInitData();
    setInitDataLength(initData?.length ?? 0);

    if (!isTg) {
      setStatus("error");
      setErrorMsg("telegram_only");
      return;
    }

    setStatus("loading");
    if (!initData || !getTelegramUser()) {
      setStatus("telegram_web_fallback");
      return;
    }

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setStatus("error");
          setErrorMsg(data.error ?? "auth_failed");
          return;
        }
        const tgUser = getTelegramUser();
        const initDataNow = getTelegramInitData();
        if (tgUser && initDataNow) {
          const syncRes = await fetch("/api/profile/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramUser: tgUser }),
            credentials: "include",
          });
          if (syncRes.status === 401) {
            const syncData = (await syncRes.json()) as { error?: string };
            if (
              syncData.error === "telegram_init_data_missing" ||
              syncData.error === "telegram_init_data_invalid"
            ) {
              setStatus("telegram_web_fallback");
              return;
            }
          }
        } else {
          setStatus("telegram_web_fallback");
          return;
        }
        setStatus("success");
        router.replace("/map");
      })
      .catch (() => {
        setStatus("error");
        setErrorMsg("network_error");
      });
  }, [router]);

  if (telegramDetected === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Вход</h1>
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </main>
    );
  }

  if (!isTelegramWebApp()) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Вход</h1>
          <p className="text-muted-foreground">
            Откройте приложение через Telegram
          </p>
          {process.env.NODE_ENV === "development" && (
            <a
              href="/"
              className="text-sm text-primary underline underline-offset-4"
            >
              На главную
            </a>
          )}
        </div>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Вход</h1>
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Авторизация…</p>
          </div>
        </div>
      </main>
    );
  }

  const handleDevMockLogin = async () => {
    setStatus("mock_loading");
    try {
      const res = await fetch("/api/auth/dev-mock", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "mock_auth_failed");
        return;
      }
      router.replace("/map");
    } catch {
      setStatus("error");
      setErrorMsg("network_error");
    }
  };

  if (status === "telegram_web_fallback") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Откройте в Telegram</h1>
          <p className="text-sm text-muted-foreground">
            Telegram Web может не поддерживать авторизацию. Откройте приложение в Telegram Desktop или мобильном приложении.
          </p>
          <a
            href={TELEGRAM_BOT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-[#0088cc] px-4 py-3 text-sm font-medium text-white hover:bg-[#007ab8]"
          >
            Открыть в Telegram
          </a>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="block w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            Повторить
          </button>
        </div>
      </main>
    );
  }

  if (status === "error") {
    const isInitDataMissing = errorMsg === "init_data_missing";
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Ошибка входа</h1>
          <p className="text-sm text-muted-foreground">
            {errorMsg === "telegram_only"
              ? "Откройте приложение через Telegram"
              : errorMsg === "init_data_missing"
                ? "Не удалось получить данные Telegram"
                : errorMsg === "network_error"
                  ? "Ошибка сети. Попробуйте снова."
                  : "Не удалось войти. Попробуйте позже."}
          </p>
          {errorMsg && errorMsg !== "telegram_only" && errorMsg !== "init_data_missing" && errorMsg !== "network_error" && (
            <p className="text-xs text-muted-foreground/80 font-mono break-all">
              Код: {errorMsg}
            </p>
          )}
          {isInitDataMissing && (
            <div className="space-y-3">
              <a
                href={TELEGRAM_BOT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-[#0088cc] px-4 py-3 text-sm font-medium text-white hover:bg-[#007ab8]"
              >
                Открыть в Telegram
              </a>
              <p className="text-xs text-muted-foreground">
                Откройте через Menu Button бота в Telegram Desktop или мобильном приложении.
              </p>
            </div>
          )}
          {IS_DEV_TG_MOCK && isInitDataMissing && (
            <button
              type="button"
              onClick={handleDevMockLogin}
              className="rounded bg-amber-600 px-4 py-2 text-sm text-white"
            >
              Dev Mock Login
            </button>
          )}
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="block text-sm text-primary underline underline-offset-4"
          >
            Повторить
          </button>
        </div>
      </main>
    );
  }

  if (status === "mock_loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Вход</h1>
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Dev mock login…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Вход</h1>
        <p className="text-sm text-muted-foreground">Перенаправление на карту…</p>
      </div>
    </main>
  );
}
