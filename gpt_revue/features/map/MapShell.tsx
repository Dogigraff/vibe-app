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
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMyOnly(false)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  !myOnly
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setMyOnly(true)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  myOnly
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Мои
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              + Create vibe
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">15 км</span>
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
