// src/app/api/pets/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "../../lib/db"

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined
  const db = await getDb()
  const pets = await db
    .collection("pets")
    .find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .toArray()
  return NextResponse.json({ pets: pets.map(p => ({ ...p, id: String(p._id) })) })
}
