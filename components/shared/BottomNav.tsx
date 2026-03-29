"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, UserCircle } from "lucide-react";

const navItems = [
  { href: "/map", label: "Карта", Icon: MapPin },
  { href: "/profile", label: "Профиль", Icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center px-[calc(1rem+max(env(safe-area-inset-left,0px),var(--tg-pad-left,0px)))] pb-[calc(0.75rem+max(env(safe-area-inset-bottom,0px),var(--tg-pad-bottom,0px)))] pe-[calc(1rem+max(env(safe-area-inset-right,0px),var(--tg-pad-right,0px)))]">
      <div className="pointer-events-auto flex h-[62px] w-full max-w-md items-center justify-around rounded-[36px] border border-border/90 bg-secondary/95 px-2 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-secondary/80">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-[26px] px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-vibe ease-vibe-out ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-vibe-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
