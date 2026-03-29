"use client";

import { useState, useCallback, useEffect } from "react";
import { ProfileKeepAlive } from "@/components/profile-keep-alive";
import { VibeMap } from "@/features/map/VibeMap";
import { CreateVibeModal } from "@/features/parties/CreateVibeModal";
import { Button } from "@/components/ui/button";

const IS_DEV =
  process.env.NEXT_PUBLIC_DEV_TEST_MODE === "true" &&
  process.env.NEXT_PUBLIC_DEV_TG_MOCK === "true";

export function MapShell() {
  const [myOnly, setMyOnly] = useState(false);

  useEffect(() => {
    if (!IS_DEV) return;
    fetch("/api/auth/dev-mock", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [center, setCenter] = useState({ lat: 55.751244, lng: 37.618423 });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCenterChange = useCallback((c: { lat: number; lng: number }) => {
    setCenter(c);
  }, []);

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <>
      <ProfileKeepAlive />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-background/80 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-muted/80 p-1">
              <button
                type="button"
                onClick={() => setMyOnly(false)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-vibe ease-vibe-out ${
                  !myOnly
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setMyOnly(true)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-vibe ease-vibe-out ${
                  myOnly
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Мои
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-xl font-semibold shadow-md"
              onClick={() => setModalOpen(true)}
            >
              + Создать
            </Button>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">15 км</span>
        </div>
        <div className="min-h-0 flex-1">
          <VibeMap
            my={myOnly}
            onCenterChange={handleCenterChange}
            refreshKey={refreshKey}
          />
        </div>
      </div>
      <CreateVibeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        center={center}
        onCreated={handleCreated}
      />
    </>
  );
}
