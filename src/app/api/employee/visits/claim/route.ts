// src/app/api/employee/visits/claim/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { getDb, nowIso, oid } from "../../../../lib/db"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  const userId = (session as any)?.userId
  if (!session || !["EMPLOYEE","ADMIN"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { visitId } = await req.json()
  if (!visitId) return NextResponse.json({ error: "visitId required" }, { status: 400 })

  const db = await getDb()
  const res = await db.collection("visits").updateOne(
    { _id: oid(visitId), status: "OPEN" },
    { $set: { status: "CLAIMED", claimedById: oid(userId), updatedAt: nowIso() } }
  )
  if (res.matchedCount === 0) return NextResponse.json({ error: "Visit not open" }, { status: 409 })
  return NextResponse.json({ ok: true })
}
