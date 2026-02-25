import { createServerClient } from "@supabase/ssr";
import type { CookieOptionsWithName } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

export async function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptionsWithName }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // SameSite=None + Secure для работы в Telegram WebView (iframe)
              const merged = { ...options, sameSite: "none" as const, secure: true };
              cookieStore.set(name, value, merged);
            });
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  );
}
