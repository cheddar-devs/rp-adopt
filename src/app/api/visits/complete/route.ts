// src/app/api/employee/visits/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getDb, nowIso, oid } from "../../../lib/db";
import { ObjectId } from "mongodb";

function toUserOid(session: any): ObjectId | null {
  const sid =
    (session?.user as any)?.id ||
    (session as any)?.userId ||
    (session as any)?.user?._id ||
    null;
  if (sid && ObjectId.isValid(String(sid))) return oid(String(sid));
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session || !["EMPLOYEE", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const visitId = String(body.visitId ?? "");
  const outcome = String(body.outcome ?? "").toUpperCase();

  const commentRaw =
    typeof body.comment === "string" ? body.comment :
    typeof body.notes === "string" ? body.notes :
    null;
  const comment = commentRaw ? commentRaw.trim() : null;

  const pdBackgroundCheck = body.pdBackgroundCheck === true;

  if (!ObjectId.isValid(visitId) || !["PASS", "FAIL"].includes(outcome)) {
    return NextResponse.json({ error: "visitId & valid outcome required" }, { status: 400 });
  }

  if (!pdBackgroundCheck) {
    return NextResponse.json(
      { error: "PD background check is required before submitting." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const visits = db.collection("visits");
  const pets = db.collection("pets");

  const visit = await visits.findOne({ _id: oid(visitId) });
  if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  if (!["OPEN", "CLAIMED"].includes(visit.status)) {
    return NextResponse.json({ error: "Visit not in progress" }, { status: 409 });
  }

  const meId = toUserOid(session);
  if (visit.claimedById && meId && !visit.claimedById.equals?.(meId)) {
    return NextResponse.json({ error: "Claimed by another employee" }, { status: 403 });
  }

  const reviewerName =
    (session?.user as any)?.characterName ||
    (session?.user as any)?.name ||
    (session?.user as any)?.username ||
    (session?.user as any)?.email ||
    (session?.user as any)?.discordId ||
    "Employee";

  const now = nowIso();

  // --- COMPLETE VISIT ---
  const visitUpdate = await visits.updateOne(
    { _id: oid(visitId) },
    {
      $set: {
        status: "COMPLETED",
        outcome,
        comment: comment ?? null,
        pdBackgroundCheck: true,
        completedAt: now,
        completedBy: reviewerName,
        completedById: meId ?? null,
        updatedAt: now,
        ...(visit.claimedById ? {} : { claimedById: meId ?? null }),
      },
      $unset: { photos: "" },
    }
  );

  // --- UPDATE PET STATUS BASED ON OUTCOME ---
  const rawPetId = visit?.petId;
  const petObjectId =
    rawPetId && ObjectId.isValid(String(rawPetId))
      ? new ObjectId(String(rawPetId))
      : null;
  console.log(pets)
  if (!petObjectId) {
    return NextResponse.json({
      ok: false,
      error: "Visit has no valid petId",
      visitId,
      rawPetId: visit?.petId ?? null,
    }, { status: 400 });
  }

  let petWrite;
  if (outcome === "PASS") {
    // PASS → ADOPTED
    petWrite = await pets.updateOne(
      { _id: petObjectId },
      {
        $set: {
          status: "ADOPTED",
          activeVisitId: new ObjectId(visitId),
          updatedAt: now,
        },
      },
      { upsert: false }
    );
  } else {
    // FAIL → AVAILABLE
    petWrite = await pets.updateOne(
      { _id: petObjectId },
      {
        $set: { status: "AVAILABLE", updatedAt: now },
        $unset: { activeVisitId: "" },
      },
      { upsert: false }
    );
  }

  const petAfter = await pets.findOne(
    { _id: petObjectId },
    { projection: { name: 1, status: 1, activeVisitId: 1, updatedAt: 1 } }
  );

  // --- RETURN RESULT ---
  return NextResponse.json({
    ok: true,
    outcome,
    visitId,
    petId: petObjectId.toHexString(),
    visitUpdated: visitUpdate.modifiedCount === 1,
    petUpdate: {
      matchedCount: petWrite.matchedCount,
      modifiedCount: petWrite.modifiedCount,
    },
    petAfter,
  });
}
