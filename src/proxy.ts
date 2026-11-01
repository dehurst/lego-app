import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every page/API request (see `matcher` below).
// Its one job: keep the login session fresh. Supabase login tokens last an
// hour; when one expires, this swaps it for a new one and updates the cookie,
// so people stay logged in for weeks without noticing.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(new URL(url).origin, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        // Update the request (so the page sees the new session) AND the
        // response (so the browser saves it).
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // e.g. Cache-Control: private — never let a CDN cache someone's session.
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Checking the claims triggers the refresh when needed.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images, icons, the manifest and the
    // service worker — those never need a session.
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|svg|ico|webp)$).*)",
  ],
};
