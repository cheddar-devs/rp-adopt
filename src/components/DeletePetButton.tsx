"use client";

import * as React from "react";

export default function DeletePetButton({ petId, petName }: { petId: string; petName: string }) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onDelete() {
    setErr(null);
    if (!confirm(`Delete ${petName}? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const r = await fetch(`/api/admin/pets/${encodeURIComponent(petId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || "Failed to delete pet");
      }
      // simplest refresh for server-rendered list
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete pet");
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
      {err && (
        <span
          className="badge"
          style={{
            background: "rgba(255,110,110,.18)",
            borderColor: "rgba(255,110,110,.35)",
            color: "#ffd7d7",
          }}
          title={err}
        >
          Error
        </span>
      )}
      <button
        className="btn"
        onClick={onDelete}
        disabled={loading}
        title={loading ? "Deleting…" : `Delete ${petName}`}
        style={{
          borderColor: "rgba(255,255,255,.16)",
          background: "rgba(255,255,255,.06)",
        }}
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
