// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { getDb, nowIso } from "./db"

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",").map(s => s.trim()).filter(Boolean)

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") return false

      const discordId = account.providerAccountId
      const isAdmin = ADMIN_IDS.includes(discordId)

      const username = (profile as any)?.username ?? null
      const avatar = (profile as any)?.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${(profile as any).avatar}.png`
        : null

      const db = await getDb()
      const existing = await db.collection("users").findOne({ discordId })

      // Reject if not found AND not an env-admin
      if (!existing && !isAdmin) return false

      // If found, update some fields (NO UPSERT)
      if (existing) {
        await db.collection("users").updateOne(
          { discordId },
          {
            $set: {
              username,
              avatarUrl: avatar,
              // keep DB role authoritative; do not overwrite it with env role
              updatedAt: nowIso(),
            },
          }
        )
      }

      // Allow sign-in (admins can pass even without DB record; no auto-add)
      return true
    },

    async jwt({ token, account }) {
      // Resolve discordId from the initial sign-in or existing token
      const discordId =
        account?.provider === "discord"
          ? account.providerAccountId
          : (token as any).discordId

      if (!discordId) return token

      const isAdmin = ADMIN_IDS.includes(discordId)

      const db = await getDb()
      const user = await db.collection("users").findOne(
        { discordId: String(discordId) },
        { projection: { _id: 1, discordId: 1, role: 1 } }
      )

      if (user) {
        token.userId = String(user._id)
        ;(token as any).discordId = user.discordId
        ;(token as any).role = user.role // DB role is source of truth when present
      } else if (isAdmin) {
        // Admin not in DB: allow with ADMIN role but no userId
        ;(token as any).discordId = String(discordId)
        ;(token as any).role = "ADMIN"
        delete (token as any).userId
      } else {
        // Shouldn't happen because signIn would have rejected, but be safe
        delete (token as any).discordId
        delete (token as any).role
        delete (token as any).userId
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session as any).userId = (token as any).userId ?? null
        ;(session.user as any).discordId = (token as any).discordId ?? null
        ;(session.user as any).role = (token as any).role ?? null
      }
      return session
    },
  },
}
