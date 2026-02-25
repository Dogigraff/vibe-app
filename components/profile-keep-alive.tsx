"use client";

import { useEffect, useRef } from "react";
import { getTelegramUser } from "@/lib/telegram";

const INTERVAL_MS = 60_000;

function hasValidInitData(): boolean {
  if (typeof window === "undefined") return false;
  const initData = window.Telegram?.WebApp?.initData;
  return !!(initData && initData.length >= 20);
}

export function ProfileKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hasValidInitData()) return;

    const tgUser = getTelegramUser();
    if (!tgUser) return;

    const sync = () => {
      if (!hasValidInitData()) return;
      fetch("/api/profile/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: tgUser }),
        credentials: "include",
      }).catch(() => {
        // Silent fail for keep-alive
      });
    };

    sync();
    intervalRef.current = setInterval(sync, INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return null;
}
