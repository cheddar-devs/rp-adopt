// src/app/api/admin/pets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";
import { ObjectId } from "mongodb";

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← params is a Promise on Next 16
) {
  const { id } = await ctx.params; // ← unwrap it

  const session = await getServerSession(authOptions);
  const discordId = (session?.user as any)?.discordId as string | undefined;
  const isAdmin = !!discordId && ADMIN_IDS.includes(discordId || "");

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid pet id" }, { status: 400 });
  }

  const db = await getDb();
  const res = await db.collection("pets").deleteOne({ _id: new ObjectId(id) });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
