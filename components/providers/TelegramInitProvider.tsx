"use client";

import { useEffect } from "react";
import { initTelegramWebApp, isTelegramWebApp } from "@/lib/telegram";

export function TelegramInitProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const run = () => {
      if (!isTelegramWebApp()) return false;
      initTelegramWebApp();
      return true;
    };

    if (run()) return;

    const start = performance.now();
    const id = window.setInterval(() => {
      if (run() || performance.now() - start > 4000) {
        window.clearInterval(id);
      }
    }, 32);

    return () => window.clearInterval(id);
  }, []);

  return <>{children}</>;
}
