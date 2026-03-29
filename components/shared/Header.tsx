"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link
          href="/map"
          className="flex items-center gap-2 font-bold text-lg"
        >
          <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
            VIBE
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
