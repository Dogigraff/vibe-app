import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, icon.svg, sitemap.xml, robots.txt
         * - Static assets (svg, png, jpg, etc.)
         * - API routes handled separately
         */
        "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|sitemap\\.xml|robots\\.txt|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
