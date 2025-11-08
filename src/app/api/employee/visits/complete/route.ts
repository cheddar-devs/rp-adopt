// src/app/api/employee/visits/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { getDb, nowIso } from "@/app/lib/db";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const discordId = (session?.user as any)?.discordId;
  if (!discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { visitId, outcome, comment } = body as {
    visitId?: string;
    outcome?: "PASS" | "FAIL";
    comment?: string;
  };

  if (!visitId || !ObjectId.isValid(visitId)) {
    return NextResponse.json({ error: "visitId required" }, { status: 400 });
  }
  if (outcome !== "PASS" && outcome !== "FAIL") {
    return NextResponse.json({ error: "outcome must be PASS or FAIL" }, { status: 400 });
  }
  if (!comment || comment.trim().length < 4) {
    return NextResponse.json({ error: "comment is required (min 4 chars)" }, { status: 400 });
  }

  const db = await getDb();
  const visitsCol = db.collection("visits");
  const petsCol = db.collection("pets");

  // who completed it (pull characterName from users collection)
  const user = await db.collection("users").findOne(
    { discordId: String(discordId) },
    { projection: { _id: 1, discordId: 1, characterName: 1, username: 1 } }
  );

  const completedBy = {
    userId: user?._id ? String(user._id) : null,
    discordId: String(discordId),
    characterName: user?.characterName ?? user?.username ?? null,
  };

  // Grab the visit first so we know which pet to update
  const visitObjectId = new ObjectId(visitId);
  const visit = await visitsCol.findOne(
    { _id: visitObjectId },
    { projection: { _id: 1, status: 1, petId: 1 } }
  );

  if (!visit || !["OPEN", "CLAIMED"].includes(visit.status)) {
    return NextResponse.json({ error: "Visit not found or not open/claimed" }, { status: 404 });
  }

  const now = nowIso();

  // Complete the visit
  const res = await visitsCol.updateOne(
    { _id: visitObjectId, status: { $in: ["OPEN", "CLAIMED"] } },
    {
      $set: {
        status: "COMPLETED",
        outcome,                                 // "PASS" | "FAIL"
        comment: String(comment).trim(),         // persist comment
        completedAt: now,
        completedBy,                             // rich object
      },
      $unset: { claimedById: "" },
    }
  );

  if (res.matchedCount === 0) {
    return NextResponse.json({ error: "Visit not found or not open/claimed" }, { status: 404 });
  }

  // If PASS, set the associated pet to ADOPTED and clear activeVisitId
  let petUpdate: { ok: boolean; petId?: string } = { ok: false };
  if (outcome === "PASS" && visit?.petId) {
    // petId may already be an ObjectId; normalize defensively
    const petIdValue = (visit.petId as any);
    const petObjectId =
      petIdValue instanceof ObjectId
        ? petIdValue
        : ObjectId.isValid(String(petIdValue))
        ? new ObjectId(String(petIdValue))
        : null;

    if (petObjectId) {
      const petRes = await petsCol.updateOne(
        { _id: petObjectId },
        {
          $set: {
            status: "ADOPTED",
            updatedAt: now,
          },
          $unset: { activeVisitId: "" },
        }
      );
      petUpdate = { ok: petRes.matchedCount === 1, petId: String(petObjectId) };
    }
  }

  return NextResponse.json({
    ok: true,
    visitId,
    outcome,
    petUpdated: petUpdate.ok,
    petId: petUpdate.petId ?? null,
  });
}
