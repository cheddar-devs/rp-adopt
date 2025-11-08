// src/app/api/visits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const visits = db.collection("visits");

  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") || "pending").toLowerCase();

  // 1) Build match safely
  let match: any = {};
  switch (scope) {
    case "pending":
      match = { status: { $in: ["OPEN", "CLAIMED"] } };
      break;
    case "completed":
      match = { status: "COMPLETED" };
      break;
    case "open":
      match = { status: "OPEN" };
      break;
    case "claimed":
      match = { status: "CLAIMED" };
      break;
    default:
      match = {};
  }

  // 2) Minimal projection so UI normalizers have all fields they expect
  const baseProject = {
    _id: 1,
    status: 1,
    petId: 1,
    petName: 1,
    petSpecies: 1,
    petBreed: 1,
    petAge: 1,

    purchaserName: 1,
    playerName: 1,
    scheduledAt: 1,
    visitAtUtc: 1,
    locationNote: 1,
    phone: 1,
    stateId: 1,

    claimedById: 1,
    outcome: 1,

    // completed fields
    comment: 1,
    completedAt: 1,
    completedBy: 1,

    photos: 1,
  } as const;

  // 3) Start simple: no lookups; prefer returning something over clever joins
  // (UI already tolerates missing joined pet fields via fallbacks)
  const cursor = visits
    .find(match, { projection: baseProject })
    .sort(scope === "completed" ? { completedAt: -1, _id: -1 } : { _id: -1 })
    .limit(200);

  const rows = await cursor.toArray();

  // 4) If you want pet name/species auto-filled, do a lightweight hydrate (optional)
  //    Only hydrate where missing and petId is present to avoid breaking matches.
  const needHydrate = rows.filter(r => (!r.petName || !r.petSpecies) && r.petId);
  if (needHydrate.length) {
    const petIds = needHydrate
      .map(r => r.petId)
      .filter(Boolean)
      .map((id: any) => (ObjectId.isValid(id) ? new ObjectId(String(id)) : null))
      .filter(Boolean) as ObjectId[];
    if (petIds.length) {
      const pets = await db
        .collection("pets")
        .find({ _id: { $in: petIds } }, { projection: { name: 1, species: 1, breed: 1, age: 1 } })
        .toArray();
      const petMap = new Map(pets.map(p => [String(p._id), p]));
      for (const r of needHydrate) {
        const p = petMap.get(String(r.petId));
        if (p) {
          r.petName ??= p.name;
          r.petSpecies ??= p.species;
          r.petBreed ??= p.breed ?? null;
          r.petAge ??= p.age ?? null;
        }
      }
    }
  }

  return NextResponse.json({ visits: rows });
}
