"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isTelegramWebApp,
  getTelegramInitData,
  getTelegramUser,
} from "@/lib/telegram";

const IS_DEV_TG_MOCK = process.env.NEXT_PUBLIC_DEV_TG_MOCK === "true";

export default function LoginPage() {
  const router = useRouter();
  const [telegramDetected, setTelegramDetected] = useState<boolean | null>(null);
  const [initDataLength, setInitDataLength] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "mock_loading"
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
    if (!initData) {
      setStatus("error");
      setErrorMsg("init_data_missing");
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
        if (tgUser) {
          await fetch("/api/profile/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramUser: tgUser }),
            credentials: "include",
          });
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
            <div className="space-y-2 text-left text-sm">
              <p className="text-muted-foreground">
                You must open via Telegram Menu Button using a public HTTPS
                URL. Localhost does not provide initData.
              </p>
              <p>
                isTelegramWebApp: {String(telegramDetected)}, initData length:{" "}
                {initDataLength ?? 0}
              </p>
              <Link
                href="/tg-debug"
                className="block text-primary underline underline-offset-4"
              >
                Open /tg-debug for diagnostics
              </Link>
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
