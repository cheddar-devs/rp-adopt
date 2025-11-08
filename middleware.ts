// src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const { nextUrl, url } = req
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const role = (token as any)?.role

  // protect /employee
  if (nextUrl.pathname.startsWith("/employee")) {
    if (!token) return NextResponse.redirect(new URL("/api/auth/signin", url))
  }

  // protect /admin (must be admin)
  if (nextUrl.pathname.startsWith("/admin")) {
    if (!token || role !== "ADMIN")
      return NextResponse.redirect(new URL("/api/auth/signin", url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/employee/:path*", "/admin/:path*"],
}
