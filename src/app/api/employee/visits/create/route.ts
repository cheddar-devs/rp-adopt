// src/app/api/employee/visits/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { getDb, nowIso } from "../../../../lib/db";
import { ObjectId } from "mongodb";

function isValidObjectId(id?: string) {
  try { return !!id && new ObjectId(id).toHexString() === new ObjectId(id).toHexString(); }
  catch { return false; }
}

// Recompute UTC from local string if provided, else fall back to visitAtUtc
function normalizeVisitTimes(body: any) {
  const local = body?.visitAtLocal as string | undefined; // "YYYY-MM-DDTHH:mm"
  const fromLocal = (() => {
    if (!local) return null;
    const [datePart, timePart] = local.split("T") ?? [];
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0); // local time
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString(); // UTC ISO
  })();

  const providedUtc = typeof body?.visitAtUtc === "string" ? body.visitAtUtc : null;
  const visitAtUtc = fromLocal ?? providedUtc ?? null;

  return {
    visitAtLocal: local ?? null,
    visitAtUtc, // final source of truth
    tz: body?.tz ?? null,
    tzOffsetMinutes: typeof body?.tzOffsetMinutes === "number" ? body.tzOffsetMinutes : null,
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as "USER" | "EMPLOYEE" | "ADMIN" | undefined;
  const userId = (session?.user as any)?.id || (session as any)?.userId;

  if (!session || !(role === "EMPLOYEE" || role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { petId, stateId, purchaserName, phone } = body;

  if (!isValidObjectId(petId)) return NextResponse.json({ error: "Valid petId required" }, { status: 400 });
  if (!stateId?.trim()) return NextResponse.json({ error: "stateId required" }, { status: 400 });
  if (!purchaserName?.trim()) return NextResponse.json({ error: "purchaserName required" }, { status: 400 });
  if (!/^[0-9+()\-.\s]{7,20}$/.test(String(phone || "")))
    return NextResponse.json({ error: "Valid phone required" }, { status: 400 });

  const { visitAtLocal, visitAtUtc, tz, tzOffsetMinutes } = normalizeVisitTimes(body);
  if (!visitAtUtc) return NextResponse.json({ error: "Valid visit date/time required" }, { status: 400 });

  const db = await getDb();
  const visits = db.collection("visits");
  const pets = db.collection("pets");

  const pet = await pets.findOne({ _id: new ObjectId(petId) });
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.status === "ADOPTED") return NextResponse.json({ error: "Pet already adopted" }, { status: 409 });

  const now = nowIso();
  const doc = {
    petId: new ObjectId(petId),
    status: "OPEN" as const,
    outcome: null as null | string,
    createdById: userId && isValidObjectId(userId) ? new ObjectId(userId) : null,
    claimedById: null as null | ObjectId,

    // New canonical time fields
    visitAtUtc,           // ISO in UTC (source of truth)
    visitAtLocal,         // original local "YYYY-MM-DDTHH:mm" (optional, for display)
    tz: tz || null,       // e.g., "America/New_York"
    tzOffsetMinutes: typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : null, // e.g., 240

    // Other required info
    stateId: String(stateId).trim(),
    purchaserName: String(purchaserName).trim(),
    phone: String(phone).trim(),

    // (optional) keep your legacy mirrors if needed by old UIs:
    playerName: String(purchaserName).trim(),
    scheduledAt: visitAtUtc,

    locationNote: body?.locationNote ?? null,
    notes: null as null | string,
    photos: [] as string[],

    createdAt: now, updatedAt: now,
  };

  const ins = await visits.insertOne(doc);
  const visitId = ins.insertedId;

  const upd = await pets.updateOne(
    { _id: new ObjectId(petId), status: "AVAILABLE", $or: [{ activeVisitId: null }, { activeVisitId: { $exists: false } }] },
    { $set: { status: "RESERVED", activeVisitId: visitId, updatedAt: nowIso() } }
  );

  if (upd.matchedCount === 0) {
    await visits.deleteOne({ _id: visitId });
    return NextResponse.json({ error: "Pet not available" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, visitId: String(visitId) }, { status: 201 });
}
