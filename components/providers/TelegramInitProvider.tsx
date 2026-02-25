"use client";

import { useEffect } from "react";
import { initTelegramWebApp } from "@/lib/telegram";

export function TelegramInitProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  return <>{children}</>;
}
