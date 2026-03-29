"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  expiresAt: string;
  /** Compact mode: just "2ч 15м" for map badges */
  compact?: boolean;
}

function getTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true, totalMinutes: 0 };

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((diff % 60000) / 1000);

  return { hours, minutes, seconds, expired: false, totalMinutes };
}

export function CountdownTimer({ expiresAt, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(expiresAt));
    }, compact ? 60000 : 1000); // Compact: update every minute. Full: every second.

    return () => clearInterval(interval);
  }, [expiresAt, compact]);

  if (timeLeft.expired) {
    return (
      <span className="text-xs font-medium text-red-500">
        Завершён
      </span>
    );
  }

  const isUrgent = timeLeft.totalMinutes < 30;
  const colorClass = isUrgent
    ? "text-red-500"
    : timeLeft.totalMinutes < 60
      ? "text-amber-500"
      : "text-muted-foreground";

  if (compact) {
    const label = timeLeft.hours > 0
      ? `${timeLeft.hours}ч ${timeLeft.minutes}м`
      : `${timeLeft.minutes}м`;

    return (
      <span className={`text-xs font-medium ${colorClass}`}>
        ⏱ {label}
      </span>
    );
  }

  // Full countdown
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={`flex items-center gap-1 text-sm font-mono font-medium ${colorClass}`}>
      <span className="text-xs">⏱</span>
      {timeLeft.hours > 0 && (
        <>
          <span>{pad(timeLeft.hours)}</span>
          <span className="opacity-50">:</span>
        </>
      )}
      <span>{pad(timeLeft.minutes)}</span>
      <span className="opacity-50">:</span>
      <span>{pad(timeLeft.seconds)}</span>
    </div>
  );
}
