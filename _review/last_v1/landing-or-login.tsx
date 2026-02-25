"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isTelegramWebApp } from "@/lib/telegram";

export function LandingOrLogin() {
  const router = useRouter();

  useEffect(() => {
    if (isTelegramWebApp()) {
      router.replace("/login");
    }
  }, [router]);

  const handleOpenVibe = () => {
    router.push("/map");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-3xl font-bold">VIBE</h1>
        <p className="max-w-sm text-muted-foreground">
          Don&apos;t be lonely. Find your vibe in 5 minutes.
        </p>
        <Button size="lg" onClick={handleOpenVibe}>
          Open VIBE
        </Button>
      </div>
    </main>
  );
}
