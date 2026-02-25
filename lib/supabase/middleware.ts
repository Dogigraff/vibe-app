import { createServerClient } from "@supabase/ssr";
import type { CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const protectedPaths = ["/map", "/profile"];
const noindexPaths = ["/map", "/profile", "/login", "/tg-debug"];

export async function updateSession(request: NextRequest) {
  // Production: hide /tg-debug (debug page)
  if (request.nextUrl.pathname === "/tg-debug") {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_DEV_TEST_MODE !== "true"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // DEV ONLY: skip auth check for protected routes when dev test mode is on
  if (process.env.NEXT_PUBLIC_DEV_TEST_MODE === "true") {
    return applyNoindex(request, NextResponse.next({ request }));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return applyNoindex(request, NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptionsWithName }[]) {
          const mergedOpts = { sameSite: "none" as const, secure: true };
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, ...mergedOpts })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return applyNoindex(request, supabaseResponse);
}

/**
 * Adds X-Robots-Tag: noindex, nofollow for private pages.
 * Bots should not index /map, /profile, /login, /tg-debug, or /api/*.
 */
function applyNoindex(request: NextRequest, response: NextResponse): NextResponse {
  const pathname = request.nextUrl.pathname;

  const shouldNoindex =
    noindexPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/");

  if (shouldNoindex) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}
