import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TelegramUser } from "@/types/telegram";
import { createHash } from "crypto";

function parseTelegramUserFromInitData(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr) as unknown;
    if (
      typeof user !== "object" ||
      user === null ||
      typeof (user as Record<string, unknown>).id !== "number"
    ) {
      return null;
    }
    const u = user as Record<string, unknown>;
    return {
      id: u.id as number,
      first_name: String(u.first_name ?? ""),
      last_name: u.last_name != null ? String(u.last_name) : undefined,
      username: u.username != null ? String(u.username) : undefined,
      language_code: u.language_code != null ? String(u.language_code) : undefined,
      is_premium: u.is_premium === true,
      photo_url: u.photo_url != null ? String(u.photo_url) : undefined,
    };
  } catch {
    return null;
  }
}

function derivePassword(telegramId: number, secret: string): string {
  return createHash("sha256").update(`${telegramId}${secret}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const secret = process.env.TELEGRAM_AUTH_SECRET;
    if (!secret || secret.trim().length === 0) {
      return NextResponse.json(
        { error: "TELEGRAM_AUTH_SECRET is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { initData?: string };
    const initData = body?.initData;
    if (!initData || typeof initData !== "string" || initData.length === 0) {
      return NextResponse.json(
        { error: "initData is required" },
        { status: 400 }
      );
    }

    const telegramUser = parseTelegramUserFromInitData(initData);
    if (!telegramUser) {
      return NextResponse.json(
        { error: "Invalid initData: user not found" },
        { status: 400 }
      );
    }

    const email = `telegram_${telegramUser.id}@telegram.vibe.app`;
    const password = derivePassword(telegramUser.id, secret);

    const supabase = await createClient();

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (!signInError) {
      return NextResponse.json({
        ok: true,
        user: signInData.user?.id,
      });
    }

    if (signInError.message?.includes("Invalid login credentials")) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            telegram_id: telegramUser.id,
            telegram_username: telegramUser.username,
            telegram_first_name: telegramUser.first_name,
            telegram_last_name: telegramUser.last_name,
          },
        },
      });

      if (signUpError) {
        return NextResponse.json(
          { error: signUpError.message },
          { status: 500 }
        );
      }

      const { data: retryData, error: retryError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (retryError) {
        return NextResponse.json(
          { error: retryError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        user: retryData.user?.id,
      });
    }

    return NextResponse.json(
      { error: signInError.message },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
