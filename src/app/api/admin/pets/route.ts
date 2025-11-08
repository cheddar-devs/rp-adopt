// src/app/api/admin/pets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getDb, nowIso } from "../../../lib/db";

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",").map(s => s.trim()).filter(Boolean);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const discordId = (session?.user as any)?.discordId;
  const isAdmin = discordId && ADMIN_IDS.includes(discordId);

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, species, breed, age, notes, photoUrl } = body;
  if (!name || !species) {
    return NextResponse.json({ error: "name & species required" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("pets").insertOne({
    name: String(name),
    species: String(species),
    breed: breed ? String(breed) : null,
    age: age ? String(age) : null,
    notes: notes ? String(notes) : null,
    photoUrl: photoUrl ? String(photoUrl) : null,
    status: "AVAILABLE",
    activeVisitId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return NextResponse.json({ ok: true });
}
