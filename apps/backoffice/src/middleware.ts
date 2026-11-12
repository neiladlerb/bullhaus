import { NextResponse, type NextRequest } from "next/server";

// Primera barrera: sin cookie de sesión se va al login. La validación real de la sesión
// y de los permisos ocurre en el servidor (requireUser).
export function middleware(req: NextRequest) {
  if (!req.cookies.has("bullhaus_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|media|api/publico|_next|favicon.ico).*)"],
};
