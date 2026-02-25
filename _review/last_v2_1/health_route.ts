import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      hasSupabase:
        !!(process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasYandexKey: !!process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
      hasTelegramSecret: !!process.env.TELEGRAM_AUTH_SECRET,
    },
  });
}
