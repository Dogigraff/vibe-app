import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TelegramRedirect } from "@/components/telegram-redirect";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/map");
  }

  return (
    <>
      <TelegramRedirect />
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
            VIBE
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Don&apos;t be lonely. Find your vibe in 5 minutes.
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Real-time geo-social network. Create vibes, join parties nearby, and meet
            people around you — all through Telegram.
          </p>
          <a
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open VIBE
          </a>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span>🗺️ Map</span>
            <span>🍻 Parties</span>
            <span>💬 Chat</span>
            <span>⭐ Reputation</span>
          </div>
        </div>
      </main>
    </>
  );
}
