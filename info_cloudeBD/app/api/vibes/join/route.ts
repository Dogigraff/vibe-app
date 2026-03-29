import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vibeId } = body;

    if (!vibeId) {
      return NextResponse.json({ error: "vibeId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверка, не находится ли пользователь уже в вайбе
    const { data: existingParticipant } = await (supabase as any)
      .from("vibe_participants")
      .select("status")
      .eq("vibe_id", vibeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingParticipant?.status === "joined") {
      return NextResponse.json({ error: "already_joined" }, { status: 409 });
    }

    // Добавление заявки (или обновление существующей, если была отклонена)
    const { error: upsertError } = await (supabase as any)
      .from("vibe_participants")
      .upsert({
        vibe_id: vibeId,
        user_id: user.id,
        status: "pending",
        joined_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ status: "pending" }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("API route error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
