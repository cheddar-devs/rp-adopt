// src/app/admin/AdminClient.tsx
"use client";
import GuardClient from "@/components/GuardClient";
import { useState } from "react";

export default function AdminClient() {
  // Employees form state
  const [discordId, setDiscordId] = useState("");
  const [characterName, setCharacterName] = useState("");

  // Pets form state
  const [pet, setPet] = useState({
    name: "",
    species: "",
    breed: "",
    age: "",
    notes: "",
    photoUrl: "",
  });

  // UI state
  const [msg, setMsg] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingPet, setSavingPet] = useState(false);

  function toast(t: string) {
    setMsg(t);
    window.setTimeout(() => setMsg(null), 2200);
  }

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();

    const body = {
      discordId: discordId.trim(),
      characterName: characterName.trim(),
    };

    if (!/^\d{15,20}$/.test(body.discordId)) {
      toast("Enter a valid Discord ID (15–20 digits).");
      return;
    }
    if (!body.characterName) {
      toast("Character Name is required.");
      return;
    }

    setSavingEmployee(true);
    try {
      const r = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        toast(t || "Error adding employee");
        return;
      }
      toast("Employee added/updated");
      setDiscordId("");
      setCharacterName("");
    } finally {
      setSavingEmployee(false);
    }
  }

  async function addPet(e: React.FormEvent) {
    e.preventDefault();

    if (!pet.name.trim() || !pet.species.trim()) {
      toast("Pet name and species are required.");
      return;
    }

    setSavingPet(true);
    try {
      const r = await fetch("/api/admin/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pet.name.trim(),
          species: pet.species.trim(),
          breed: pet.breed?.trim() || undefined,
          age: pet.age?.trim() || undefined,
          notes: pet.notes?.trim() || undefined,
          photoUrl: pet.photoUrl?.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        toast(t || "Error adding pet");
        return;
      }
      toast("Pet added");
      setPet({ name: "", species: "", breed: "", age: "", notes: "", photoUrl: "" });
    } finally {
      setSavingPet(false);
    }
  }

  return (
    <GuardClient>
      <main className="container" style={{ display: "grid", gap: 16 }}>
        <header className="sectionHead">
          <h1 className="h1">Admin</h1>
          {msg && (
            <div className="card" role="status" style={{ padding: "8px 10px" }}>
              <strong style={{ marginRight: 6 }}>✓</strong> {msg}
            </div>
          )}
        </header>

        {/* Employees card */}
        <section className="card" style={{ alignItems: "stretch", gap: 12 }}>
          <div className="meta" style={{ display: "grid", gap: 8 }}>
            <div className="titleRow">
              <span className="title">Employees</span>
              <span className="badge">Add / Update</span>
            </div>
            <p className="muted">Grant employee access by Discord ID and store their character name.</p>

            <form onSubmit={addEmployee} className="formGrid">
              <label className="field">
                <span className="muted">Discord ID</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="123456789012345678"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                />
              </label>

              <label className="field">
                <span className="muted">Character Name</span>
                <input
                  className="input"
                  placeholder="Jane Doe"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                />
              </label>

              <div className="actions">
                <button className="btn btn--primary" disabled={savingEmployee}>
                  {savingEmployee ? "Saving…" : "Add / Update Employee"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Pets card */}
        <section className="card" style={{ alignItems: "stretch", gap: 12 }}>
          <div className="meta" style={{ display: "grid", gap: 8 }}>
            <div className="titleRow">
              <span className="title">Pets</span>
              <span className="badge">Add New</span>
            </div>
            <p className="muted">Add adoptable pets to the catalog.</p>

            <form onSubmit={addPet} className="formGrid">
              <label className="field">
                <span className="muted">Name</span>
                <input
                  className="input"
                  placeholder="Mochi"
                  value={pet.name}
                  onChange={(e) => setPet((p) => ({ ...p, name: e.target.value }))}
                />
              </label>

              <label className="field">
                <span className="muted">Species</span>
                <input
                  className="input"
                  placeholder="Cat / Dog / …"
                  value={pet.species}
                  onChange={(e) => setPet((p) => ({ ...p, species: e.target.value }))}
                />
              </label>

              <label className="field">
                <span className="muted">Breed</span>
                <input
                  className="input"
                  placeholder="Shorthair"
                  value={pet.breed}
                  onChange={(e) => setPet((p) => ({ ...p, breed: e.target.value }))}
                />
              </label>

              <label className="field">
                <span className="muted">Age</span>
                <input
                  className="input"
                  placeholder="Puppy / Adult"
                  value={pet.age}
                  onChange={(e) => setPet((p) => ({ ...p, age: e.target.value }))}
                />
              </label>

              <label className="field field--full">
                <span className="muted">Photo URL</span>
                <input
                  className="input"
                  placeholder="https://…"
                  value={pet.photoUrl}
                  onChange={(e) => setPet((p) => ({ ...p, photoUrl: e.target.value }))}
                />
              </label>

              <label className="field field--full">
                <span className="muted">Notes</span>
                <textarea
                  className="input"
                  placeholder="Temperament, medical notes, etc."
                  value={pet.notes}
                  onChange={(e) => setPet((p) => ({ ...p, notes: e.target.value }))}
                  rows={4}
                />
              </label>

              <div className="actions">
                <button className="btn btn--primary" disabled={savingPet}>
                  {savingPet ? "Saving…" : "Add Pet"}
                </button>
              </div>
            </form>
          </div>
        </section>

        <style jsx>{`
          .formGrid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .field { display: grid; gap: 6px; }
          .field--full { grid-column: 1 / -1; }
          .actions {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 4px;
          }
          .input {
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.06);
            color: var(--text);
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          }
          .input:hover { border-color: rgba(255, 255, 255, 0.18); }
          .input:focus {
            border-color: rgba(124, 156, 255, 0.55);
            box-shadow: var(--ring);
            background: rgba(255, 255, 255, 0.08);
          }
          @media (max-width: 640px) {
            .formGrid { grid-template-columns: 1fr; }
          }
        `}</style>
      </main>
    </GuardClient>
  );
}
