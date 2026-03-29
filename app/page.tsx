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
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <div className="flex flex-col items-center gap-8 text-center max-w-2xl mx-auto flex-1 justify-center">
          <h1 className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl">
            VIBE
          </h1>
          <p className="text-xl sm:text-2xl font-medium text-foreground">
            Не будь один. Найди свой вайб за 5 минут.
          </p>
          <p className="max-w-md text-base text-muted-foreground">
            Первая геосоциальная сеть прямо в Telegram. Создавай свои вайбы, присоединяйся к тусовкам поблизости и знакомься с людьми на карте.
          </p>

          <a
            href="/login"
            className="mt-4 flex h-14 w-full sm:w-auto items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 text-lg font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            Открыть VIBE
          </a>

          <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-8 text-sm sm:text-base font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              <span>Карта вайбов</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🍻</span>
              <span>Вечеринки</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <span>Чат</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <span>Репутация</span>
            </div>
          </div>
        </div>

        {/* Telegram Mini App Badge */}
        <div className="mt-12 mb-6 flex items-center justify-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm">
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
