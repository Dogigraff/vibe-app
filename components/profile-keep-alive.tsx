"use client";

import { useEffect, useRef } from "react";
import { getTelegramUser } from "@/lib/telegram";

const INTERVAL_MS = 60_000;

export function ProfileKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tgUser = getTelegramUser();
    if (!tgUser) return;

    const sync = () => {
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
