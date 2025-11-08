// src/app/admin/AdminClient.tsx
"use client";
import GuardClient from "@/components/GuardClient";
import { useState } from "react";

const BREEDS = [
  "Cat-Shaped",
  "Husky",
  "Poodle",
  "Pug",
  "Golden Retriever",
  "Rottweiler",
  "Australian Shepherd",
  "Westy",
] as const;

type SpeciesChoice = "Cat" | "Dog" | "Custom";
type BreedChoice = typeof BREEDS[number] | "Custom" | "";

export default function AdminClient() {
  // Employees form state
  const [discordId, setDiscordId] = useState("");
  const [characterName, setCharacterName] = useState("");

  // Pets form state
  const [pet, setPet] = useState({
    name: "",
    species: "",   // actual value sent (from dropdown OR custom)
    breed: "",     // actual value sent (from dropdown OR custom)
    age: "",
    notes: "",
    photoUrl: "",
  });

  // Dropdown state
  const [speciesChoice, setSpeciesChoice] = useState<SpeciesChoice>("Cat");
  const [speciesCustom, setSpeciesCustom] = useState<string>("");

  const [breedChoice, setBreedChoice] = useState<BreedChoice>("");
  const [breedCustom, setBreedCustom] = useState<string>("");

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

    // Resolve what we’ll send based on dropdown vs custom states
    const resolvedSpecies =
      speciesChoice === "Custom" ? speciesCustom.trim() : speciesChoice;

    const resolvedBreed =
      breedChoice === "Custom" ? breedCustom.trim() : (breedChoice || "").trim();

    if (!pet.name.trim() || !resolvedSpecies) {
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
          species: resolvedSpecies,
          breed: resolvedBreed || undefined,
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

      // Reset everything to sensible defaults
      setPet({ name: "", species: "", breed: "", age: "", notes: "", photoUrl: "" });
      setSpeciesChoice("Cat");
      setSpeciesCustom("");
      setBreedChoice("");
      setBreedCustom("");
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
            <p className="muted">
              Grant employee access by Discord ID and store their character name.
            </p>

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

              {/* Species */}
              <label className="field">
                <span className="muted">Species</span>
                <select
                  className="input"
                  value={speciesChoice}
                  onChange={(e) => {
                    const choice = e.target.value as SpeciesChoice;
                    setSpeciesChoice(choice);
                    if (choice === "Custom") {
                      // Switch to custom entry mode
                      setSpeciesCustom("");
                      setPet((p) => ({ ...p, species: "" }));
                    } else {
                      // Chose Cat/Dog from dropdown
                      setSpeciesCustom("");
                      setPet((p) => ({ ...p, species: choice }));
                    }
                  }}
                >
                  <option value="Cat">Cat</option>
                  <option value="Dog">Dog</option>
                  <option value="Custom">Custom…</option>
                </select>
                {speciesChoice === "Custom" && (
                  <input
                    className="input"
                    placeholder="Enter species"
                    value={speciesCustom}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpeciesCustom(val);
                      setPet((p) => ({ ...p, species: val }));
                    }}
                    style={{ marginTop: 8 }}
                  />
                )}
              </label>

              {/* Breed */}
              <label className="field">
                <span className="muted">Breed</span>
                <select
                  className="input"
                  value={breedChoice}
                  onChange={(e) => {
                    const choice = e.target.value as BreedChoice;
                    setBreedChoice(choice);
                    if (choice === "Custom") {
                      // Switch to custom entry mode
                      setBreedCustom("");
                      setPet((p) => ({ ...p, breed: "" }));
                    } else {
                      // Predefined or blank
                      setBreedCustom("");
                      setPet((p) => ({ ...p, breed: choice || "" }));
                    }
                  }}
                >
                  <option value="">— Select —</option>
                  {BREEDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="Custom">Custom…</option>
                </select>
                {breedChoice === "Custom" && (
                  <input
                    className="input"
                    placeholder="Enter breed"
                    value={breedCustom}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBreedCustom(val);
                      setPet((p) => ({ ...p, breed: val }));
                    }}
                    style={{ marginTop: 8 }}
                  />
                )}
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

          /* Unified dark theme */
          .input,
          select.input,
          textarea.input {
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.10);
            background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
            color: var(--text);
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          }

          .input:hover,
          select.input:hover,
          textarea.input:hover {
            border-color: rgba(163,230,53,0.25);
            background: rgba(255,255,255,.06);
          }

          .input:focus,
          select.input:focus,
          textarea.input:focus {
            border-color: rgba(124,156,255,0.55);
            box-shadow: var(--ring);
            background: rgba(255,255,255,.08);
          }

          /* Dark dropdowns */
          select.input {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            cursor: pointer;
            background-color: var(--card);
            color: var(--text);
            background-image: linear-gradient(135deg, var(--brand), var(--brand-2));
            background-repeat: no-repeat;
            background-size: 14px 14px;
            background-position: right 12px center;
          }
          select.input option {
            background-color: var(--card);
            color: var(--text);
          }

          textarea.input {
            resize: vertical;
            min-height: 120px;
          }

          .card {
            background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
            border: 1px solid rgba(255,255,255,.10);
            border-radius: 14px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
          }

          .card:hover {
            transform: translateY(-2px);
            border-color: rgba(163,230,53,.25);
            box-shadow: 0 12px 28px rgba(0,0,0,.45),
                        0 0 0 1px rgba(34,197,94,.18) inset;
          }

          .muted { color: var(--muted); }

          @media (max-width: 640px) {
            .formGrid { grid-template-columns: 1fr; }
          }

          /* Global override for stubborn OS dropdowns */
          select, option {
            background-color: var(--card) !important;
            color: var(--text) !important;
          }
        `}</style>
      </main>
    </GuardClient>
  );
}
