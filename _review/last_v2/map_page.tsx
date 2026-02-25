"use client";

import { useState } from "react";
import { ProfileKeepAlive } from "@/components/profile-keep-alive";
import { VibeMap } from "@/features/map/VibeMap";

export default function MapPage() {
  const [myOnly, setMyOnly] = useState(false);

  return (
    <>
      <ProfileKeepAlive />
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMyOnly(false)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                !myOnly ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setMyOnly(true)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                myOnly ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Мои
            </button>
          </div>
          <span className="text-xs text-muted-foreground">15 км</span>
        </div>
        <div className="min-h-0 flex-1">
          <VibeMap my={myOnly} />
        </div>
      </div>
    </>
  );
}
