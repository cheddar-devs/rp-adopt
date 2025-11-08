// src/app/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",").map(s => s.trim()).filter(Boolean);

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const discordId = (session?.user as any)?.discordId;
  const isAdmin = discordId && ADMIN_IDS.includes(discordId);

  if (!isAdmin) {
    redirect("/"); // or redirect("/login") / notFound()
  }

  return <AdminClient />;
}
