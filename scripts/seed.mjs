// seed.mjs (ESM)
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = (process.env.MONGODB_URI || '').trim();
const dbName = (process.env.MONGODB_DB || '').trim();

if (!uri) {
  console.error('❌ MONGODB_URI is missing.');
  process.exit(1);
}
if (!dbName) {
  console.error('❌ MONGODB_DB is missing.');
  process.exit(1);
}

const client = new MongoClient(uri);
const nowIso = () => new Date().toISOString();

async function main() {
  console.log(`🔗 Connecting to MongoDB…`);
  await client.connect();

  const db = client.db(dbName);

  // ---- FULL RESET: drop the entire database
  console.log(`🧨 Dropping database '${dbName}'…`);
  await db.dropDatabase();

  // ---- (Re)create collections & indexes you rely on
  console.log('🧱 Creating collections & indexes…');
  await Promise.all([
    db.collection('pets').createIndexes([
      { key: { status: 1 } },
      { key: { name: 1 } },
    ]),
    db.collection('visits').createIndexes([
      { key: { status: 1 } },
      { key: { pet_id: 1 } },
      { key: { completed_at: -1 } },
    ]),
  ]);

  // ---- Seed data
  console.log('🌱 Seeding pets…');
  await db.collection('pets').insertMany([
    {
      name: 'Mochi',
      species: 'Cat',
      breed: 'Shorthair',
      age: 'Adult',
      status: 'AVAILABLE',
      activeVisitId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      name: 'Pepper',
      species: 'Dog',
      breed: 'Mixed',
      age: 'Puppy',
      status: 'AVAILABLE',
      activeVisitId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]);

  // Optional: start with an empty visits collection (already created above)
  // await db.collection('visits').insertMany([])

  console.log('✅ Database reset & seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await client.close();
      console.log('🔒 MongoDB connection closed.');
    } catch (e) {
      console.error('⚠️ Error closing MongoDB client:', e);
    }
  });
