"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/map", label: "Map", icon: "🗺️" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
      <div className="flex h-14 items-center justify-around">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 px-6 py-2 text-xs ${
              pathname?.startsWith(href)
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
