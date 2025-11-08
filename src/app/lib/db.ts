// src/lib/db.ts
import { MongoClient, Db, ObjectId } from "mongodb"

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) return db
  const uri = process.env.MONGODB_URI!
  const name = process.env.MONGODB_DB!
  client = new MongoClient(uri, { maxPoolSize: 10 })
  await client.connect()
  db = client.db(name)
  await ensureIndexes(db)
  return db
}

async function ensureIndexes(db: Db) {
  await db.collection("users").createIndex({ discordId: 1 }, { unique: true })
  await db.collection("pets").createIndex({ status: 1 })
  await db.collection("visits").createIndex({ status: 1, petId: 1 })
}

// Helpers
export const oid = (id: string) => new ObjectId(id)
export const nowIso = () => new Date().toISOString()
