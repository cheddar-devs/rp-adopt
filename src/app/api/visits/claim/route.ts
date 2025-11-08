// src/app/api/employee/visits/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getDb, nowIso } from "../../../lib/db";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as "USER" | "EMPLOYEE" | "ADMIN" | undefined;
  const userIdRaw = (session?.user as any)?.id || (session as any)?.userId || null;

  if (!session || !(role === "EMPLOYEE" || role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const visitId = body?.visitId as string;

  if (!visitId || !ObjectId.isValid(visitId)) {
    return NextResponse.json({ error: "Valid visitId required" }, { status: 400 });
  }

  const reviewerId =
    userIdRaw && ObjectId.isValid(String(userIdRaw)) ? new ObjectId(String(userIdRaw)) : null;

  const db = await getDb();
  const visits = db.collection("visits");

  const upd = await visits.updateOne(
    { _id: new ObjectId(visitId), status: "OPEN" },
    {
      $set: {
        status: "CLAIMED",
        claimedById: reviewerId, // may be null if no valid ObjectId
        updatedAt: nowIso(),
      },
    }
  );

  if (upd.matchedCount === 0) {
    return NextResponse.json({ error: "Visit not open" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
