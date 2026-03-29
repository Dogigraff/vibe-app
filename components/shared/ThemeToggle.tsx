"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check Telegram theme first, then localStorage, then system preference
    const tgTheme =
      typeof window !== "undefined" &&
      (window as any).Telegram?.WebApp?.colorScheme;

    if (tgTheme) {
      setIsDark(tgTheme === "dark");
      document.documentElement.classList.toggle("dark", tgTheme === "dark");
    } else {
      const stored = localStorage.getItem("vibe-theme");
      if (stored) {
        const dark = stored === "dark";
        setIsDark(dark);
        document.documentElement.classList.toggle("dark", dark);
      } else {
        /* VIBE: тёмная тема по умолчанию (как в макете), пока пользователь не выбрал иное */
        setIsDark(true);
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("vibe-theme", next ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
