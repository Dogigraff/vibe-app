"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 max-w-lg items-center justify-between px-4 sm:max-w-none">
        <Link
          href="/map"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
        >
          <span className="bg-gradient-to-br from-vibe-accent-soft via-vibe-accent to-vibe-accent bg-clip-text text-transparent">
            VIBE
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
