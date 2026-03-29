import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TelegramRedirect } from "@/components/telegram-redirect";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIBE — найди свою тусовку за 5 минут",
  description:
    "Real-time геосоциальная сеть в Telegram. Находи крутые тусовки, создавай вайбы и знакомься с новыми людьми рядом с тобой за 5 минут.",
  openGraph: {
    title: "VIBE — найди свою тусовку за 5 минут",
    description:
      "Real-time геосоциальная сеть в Telegram. Находи крутые тусовки и знакомься с новыми людьми рядом с тобой.",
    images: ["/og-image.png"],
    locale: "ru_RU",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,93,117,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(139,92,246,0.2), transparent 50%)",
          }}
        />
        <div className="relative z-[1] mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-8 text-center">
          <h1 className="bg-gradient-to-br from-vibe-t1 via-vibe-accent to-vibe-accent-soft bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            VIBE
          </h1>
          <p className="text-balance text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            Живые встречи рядом на 5 минут — без бесконечных лент.
          </p>
          <p className="max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
            Геовайбы в Telegram: карта рядом, быстрый join и чат только для участников.
          </p>

          <a
            href="/login"
            className="mt-2 flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-vibe-accent transition-transform duration-vibe ease-vibe-out hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] sm:w-auto"
          >
            Открыть VIBE
          </a>

          <div className="flex max-w-sm flex-col gap-3 text-left text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="mt-0.5 text-primary" aria-hidden>
                ●
              </span>
              <span>Геолокация — чтобы показать «рядом сейчас», без лишнего шума.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-0.5 text-primary" aria-hidden>
                ●
              </span>
              <span>Личные данные видны только в контексте вайба и чата.</span>
            </p>
          </div>
        </div>

        {/* Telegram Mini App Badge */}
        <div className="relative z-[1] mt-10 mb-6 flex items-center justify-center gap-2 rounded-full border border-border/80 bg-secondary/60 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-md">
          <svg
            className="h-5 w-5 text-[#2AABEE]"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.18 3.44-.49.34-.93.5-1.33.49-.44-.01-1.28-.24-1.91-.45-.77-.25-1.38-.38-1.33-.8.02-.22.33-.44.91-.67 3.56-1.55 5.94-2.58 7.14-3.08 3.39-1.42 4.1-1.66 4.56-1.67.1 0 .33.02.46.12.11.08.14.2.16.29.02.05.02.26.01.37z" />
          </svg>
          Работает как Telegram Mini App
        </div>
      </main>
    </>
  );
}
