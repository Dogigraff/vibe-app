"use client";

import { useEffect, useState } from "react";
import {
  isTelegramWebApp,
  getTelegramInitData,
  getTelegramUser,
} from "@/lib/telegram";
import Link from "next/link";

interface DebugState {
  isTg: boolean;
  platform?: string;
  version?: string;
  initDataLength: number;
  userSafe?: { id?: number; username?: string; first_name?: string };
  url: string;
  userAgent: string;
}

const BOTFATHER_STEPS = `1. Open @BotFather in Telegram
2. Send /mybots and select your bot
3. Bot Settings → Menu Button → Configure menu button
4. Enter your public HTTPS URL (e.g. https://your-tunnel.ngrok-free.app)
5. Save. Users tap the menu button to open your Web App with initData`;

const TUNNEL_CMD =
  "ngrok http 3000";

export default function TgDebugPage() {
  const [state, setState] = useState<DebugState | null>(null);
  const [showBotFather, setShowBotFather] = useState(false);

  useEffect(() => {
    const isTg = isTelegramWebApp();
    const initData = getTelegramInitData();
    const user = getTelegramUser();

    let platform: string | undefined;
    let version: string | undefined;
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const wa = window.Telegram.WebApp as Record<string, unknown>;
      platform = typeof wa.platform === "string" ? wa.platform : undefined;
      version = typeof wa.version === "string" ? wa.version : undefined;
    }

    setState({
      isTg,
      platform,
      version,
      initDataLength: initData?.length ?? 0,
      userSafe: user
        ? {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
          }
        : undefined,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
  }, []);

  const copyTunnelCmd = () => {
    navigator.clipboard.writeText(TUNNEL_CMD);
  };

  const isOk =
    state &&
    state.isTg &&
    state.initDataLength > 0 &&
    state.userSafe !== undefined;

  if (state === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Telegram WebApp Debug</h1>

      <div
        className={`rounded-lg border-2 p-4 ${
          isOk
            ? "border-green-600 bg-green-50 dark:bg-green-950/30"
            : "border-red-600 bg-red-50 dark:bg-red-950/30"
        }`}
      >
        <p className="font-semibold">
          {isOk
            ? "Telegram initData present"
            : "Not launched inside Telegram WebApp"}
        </p>
        {!isOk && (
          <p className="mt-1 text-sm text-muted-foreground">
            Open this page via Telegram Menu Button using a public HTTPS URL.
          </p>
        )}
      </div>

      <div className="space-y-2 rounded border bg-muted/30 p-4 font-mono text-sm">
        <p>
          <span className="text-muted-foreground">isTelegramWebApp:</span>{" "}
          {String(state.isTg)}
        </p>
        {state.platform !== undefined && (
          <p>
            <span className="text-muted-foreground">platform:</span>{" "}
            {state.platform}
          </p>
        )}
        {state.version !== undefined && (
          <p>
            <span className="text-muted-foreground">version:</span>{" "}
            {state.version}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">initData length:</span>{" "}
          {state.initDataLength}
        </p>
        {state.userSafe !== undefined && (
          <p>
            <span className="text-muted-foreground">initDataUnsafe.user:</span>{" "}
            {JSON.stringify(state.userSafe)}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">URL:</span> {state.url}
        </p>
        <p className="break-all">
          <span className="text-muted-foreground">userAgent:</span>{" "}
          {state.userAgent}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={copyTunnelCmd}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Copy recommended tunnel command
        </button>
        <p className="text-xs text-muted-foreground">
          Run in PowerShell to expose localhost. Add the resulting HTTPS URL to
          BotFather Menu Button.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowBotFather(!showBotFather)}
          className="rounded border px-4 py-2 text-sm"
        >
          {showBotFather ? "Hide" : "Open"} BotFather instructions
        </button>
        {showBotFather && (
          <pre className="mt-2 whitespace-pre-wrap rounded border bg-muted/30 p-4 text-sm">
            {BOTFATHER_STEPS}
          </pre>
        )}
      </div>

      <Link
        href="/login"
        className="text-sm text-primary underline underline-offset-4"
      >
        ← Back to Login
      </Link>
    </main>
  );
}
