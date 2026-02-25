"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <Link href="/map" className="flex items-center space-x-2 font-bold">
          VIBE
        </Link>
      </div>
    </header>
  );
}
