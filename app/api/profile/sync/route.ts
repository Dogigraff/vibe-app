import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TelegramUser } from "@/types/telegram";
import type { TablesUpdate } from "@/types/supabase";

function parseTelegramUser(body: unknown): TelegramUser | null {
  if (typeof body !== "object" || body === null) return null;
  const obj = body as Record<string, unknown>;
  const user = obj.telegramUser;
  if (typeof user !== "object" || user === null) return null;
  const u = user as Record<string, unknown>;
  if (typeof u.id !== "number") return null;
  return {
    id: u.id,
    first_name: String(u.first_name ?? ""),
    last_name: u.last_name != null ? String(u.last_name) : undefined,
    username: u.username != null ? String(u.username) : undefined,
    language_code: u.language_code != null ? String(u.language_code) : undefined,
    is_premium: u.is_premium === true,
    photo_url: u.photo_url != null ? String(u.photo_url) : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const telegramUser = parseTelegramUser(body);
    if (!telegramUser) {
      return NextResponse.json(
        { error: "telegramUser is required" },
        { status: 400 }
      );
    }

    const username = telegramUser.username
      ? `@${telegramUser.username.replace(/^@/, "")}`
      : `tg_${telegramUser.id}`;
    const avatar_url = telegramUser.photo_url ?? null;

    const payload: TablesUpdate<"profiles"> = {
      username,
      avatar_url,
      last_active_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .schema("public")
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
