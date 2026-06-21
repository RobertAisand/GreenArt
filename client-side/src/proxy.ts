import { type NextRequest, NextResponse } from "next/server";

// Дублируем строку из auth-token.service, чтобы не тянуть js-cookie в edge-runtime.
const ACCESS_TOKEN = "accessToken";

// Next.js 16: бывший middleware теперь называется proxy (export-функция `proxy`).
export function proxy(request: NextRequest) {
  const { url, nextUrl } = request;
  const accessToken = request.cookies.get(ACCESS_TOKEN)?.value;

  const isAuthPage = nextUrl.pathname.startsWith("/auth");
  // OAuth-возврат: бэкенд редиректит на /dashboard?accessToken=... — cookie
  // ещё не выставлена, пропускаем запрос, токен сохранит сама страница.
  const isOAuthReturn = nextUrl.searchParams.has("accessToken");
  const isLoggedIn = Boolean(accessToken) || isOAuthReturn;

  // Залогиненного со страницы авторизации уводим в кабинет.
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", url));
    }
    return NextResponse.next();
  }

  // Защищённые роуты без токена — на авторизацию.
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth", url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth"],
};
