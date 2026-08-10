import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ONLY_PATHS = ["/admin", "/capture"];
const CLIENT_ONLY_PATHS = ["/client"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAdminPath = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
  const isClientPath = CLIENT_ONLY_PATHS.some((p) => pathname.startsWith(p));

  if (!user && (isAdminPath || isClientPath)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (isAdminPath || isClientPath)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "client";

    if (isAdminPath && role !== "admin") {
      return NextResponse.redirect(new URL("/client", request.url));
    }
    if (isClientPath && role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}
