"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isTelegramWebApp } from "@/lib/telegram";

export function TelegramRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isTelegramWebApp()) {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
