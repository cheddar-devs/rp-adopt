// src/components/GuardClient.tsx
"use client"
import { useSession, signIn } from "next-auth/react"

export default function GuardClient({ children, role }: { children: React.ReactNode; role?: "ADMIN"|"EMPLOYEE" }) {
  const { status, data } = useSession()
  if (status === "loading") return null
  if (status === "unauthenticated") { signIn(); return null }
  if (role === "ADMIN" && (data?.user as any)?.role !== "ADMIN") { signIn(); return null }
  return <>{children}</>
}
