// src/app/(public)/page.tsx
import Image from "next/image";
import { getDb } from "../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import ScheduleVisitButton from "../../components/ScheduleVisitButton";

type Pet = {
  _id: string;
  name: string;
  species: string;
  breed?: string | null;
  age?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  status: "AVAILABLE" | "RESERVED" | "ADOPTED";
  createdAt?: string;
  updatedAt?: string;
};

type Role = "USER" | "EMPLOYEE" | "ADMIN";

async function getPets(): Promise<Pet[]> {
  const db = await getDb();
  const docs = await db
    .collection("pets")
    .aggregate([
      { $match: { status: { $in: ["AVAILABLE", "RESERVED"] } } },
      {
        $addFields: {
          sortKey: { $cond: [{ $eq: ["$status", "AVAILABLE"] }, 0, 1] },
        },
      },
      { $sort: { sortKey: 1, createdAt: -1 } },
      { $project: { sortKey: 0 } },
    ])
    .toArray();

  return docs.map((d: any) => ({
    _id: String(d._id),
    name: d.name,
    species: d.species,
    breed: d.breed ?? null,
    age: d.age ?? null,
    notes: d.notes ?? null,
    photoUrl: d.photoUrl ?? null,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
}

async function getRole(): Promise<Role | null> {
  const session = await getServerSession(authOptions);
  return ((session?.user as any)?.role as Role) ?? null;
}

function PetCard({ pet, canSchedule }: { pet: Pet; canSchedule: boolean }) {
  return (
    <li className={`card ${pet.status === "RESERVED" ? "card--reserved" : ""}`}>
      <div className="thumb">
        {pet.photoUrl ? (
          <Image src={pet.photoUrl} alt={pet.name} fill style={{ objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "#6b7280",
            }}
          >
            no photo
          </div>
        )}
      </div>

      <div className="meta">
        <div className="titleRow">
          <span className="title">{pet.name}</span>
          {pet.status === "AVAILABLE" ? (
            <span className="badge badge--ok">Available</span>
          ) : (
            <span className="badge badge--warn">On Hold</span>
          )}
        </div>

        <div className="muted">
          {pet.species}
          {pet.breed ? ` • ${pet.breed}` : ""}
          {pet.age ? ` • ${pet.age}` : ""}
        </div>

        {pet.notes && (
          <div className="clamp1" title={pet.notes}>
            {pet.notes}
          </div>
        )}

        {canSchedule && (
          <div style={{ marginTop: 12 }}>
            <ScheduleVisitButton petId={pet._id} petName={pet.name} />
          </div>
        )}
      </div>
    </li>
  );
}

export default async function Home() {
  const [pets, role] = await Promise.all([getPets(), getRole()]);
  const canSchedule = role === "EMPLOYEE" || role === "ADMIN";

  const available = pets.filter((p) => p.status === "AVAILABLE");
  const reserved = pets.filter((p) => p.status === "RESERVED");

  return (
    <>
      <header>
        <h1 className="h1">Find your new best friend</h1>
        <p className="muted">
          Browse pets currently available for adoption. Reservations are in progress and shown below.
        </p>
      </header>

      <section style={{ marginTop: 18 }}>
        <div className="sectionHead">
          <h2 className="h2">Available ({available.length})</h2>
        </div>
        {available.length === 0 ? (
          <p className="muted">No available pets right now.</p>
        ) : (
          <ul className="grid">
            {available.map((p) => (
              <PetCard key={p._id} pet={p} canSchedule={canSchedule} />
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <div className="sectionHead">
          <h2 className="h2">On Hold ({reserved.length})</h2>
        </div>
        {reserved.length === 0 ? (
          <p className="muted">No pets are currently reserved.</p>
        ) : (
          <ul className="grid">
            {reserved.map((p) => (
              <PetCard key={p._id} pet={p} canSchedule={canSchedule} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
