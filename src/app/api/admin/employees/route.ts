// src/app/api/admin/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getDb, nowIso } from "../../../lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const discordId = String(body.discordId ?? "").trim();
  const characterName = String(body.characterName ?? "").trim();

  if (!discordId) return NextResponse.json({ error: "discordId required" }, { status: 400 });
  if (!characterName) return NextResponse.json({ error: "characterName required" }, { status: 400 });

  const db = await getDb();
  await db.collection("users").updateOne(
    { discordId },
    {
      $set: {
        role: "EMPLOYEE",
        characterName,
        updatedAt: nowIso(),
      },
      $setOnInsert: {
        createdAt: nowIso(),
        username: null,
        avatarUrl: null,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
