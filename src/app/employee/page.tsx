// src/app/employee/page.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/* =========================
   Canonical UI Types (normalized)
========================= */
type VisitStatus = "OPEN" | "CLAIMED" | "COMPLETED" | "CANCELLED";

type UIPendingVisit = {
  id: string;
  status: VisitStatus;
  petId?: string | null;
  petName: string;
  petSpecies: string;
  petBreed?: string | null;
  petAge?: string | null;
  petPhotoUrl?: string | null;

  applicant?: string | null;
  phone?: string | null;     // <-- NEW
  stateId?: string | null;   // <-- NEW
  scheduledAtUtc?: string | null;
  locationNote?: string | null;

  _claimedById?: string | null;
  _outcome?: "PASS" | "FAIL" | null;
};

type UICompletedVisit = {
  id: string;
  status: "COMPLETED";
  petId?: string | null;
  petName: string;
  petSpecies: string;
  petBreed?: string | null;
  petAge?: string | null;

  applicant?: string | null;
  phone?: string | null;     // <-- NEW
  stateId?: string | null;   // <-- NEW
  outcome?: "PASS" | "FAIL";
  comment?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  photos?: string[];
};

/* =========================
   Normalizers (API → UI)
========================= */
function toUIPending(v: any): UIPendingVisit {
  const petId = (v.petId ?? v.pet_id ?? v.pet?._id ?? null)?.toString?.() ?? null;

  return {
    id: String(v.id ?? v._id ?? ""),
    status: "OPEN",
    petId,
    petName: String(v.petName ?? v.pet_name ?? v.pet?.name ?? "Unknown"),
    petSpecies: String(v.petSpecies ?? v.pet_species ?? v.pet?.species ?? "Unknown"),
    petBreed: v.petBreed ?? v.pet_breed ?? v.pet?.breed ?? null,
    petAge: v.petAge ?? v.pet_age ?? v.pet?.age ?? null,
    petPhotoUrl: v.petPhotoUrl ?? v.pet_photo_url ?? v.pet?.photoUrl ?? null,

    applicant: v.purchaserName ?? v.playerName ?? v.player_name ?? null,
    phone: v.phone ?? v.applicantPhone ?? null,     // lenient mapping
    stateId: v.stateId ?? v.state_id ?? null,       // lenient mapping
    scheduledAtUtc: v.visitAtUtc ?? v.scheduledAt ?? v.scheduled_at ?? null,
    locationNote: v.locationNote ?? v.location_note ?? null,

    _claimedById: v.claimedById ?? v.claimed_by_id ?? null,
    _outcome: v.outcome ?? v.completed_outcome ?? null,
  };
}

function toUICompleted(v: any): UICompletedVisit {
  const petId = (v.petId ?? v.pet_id ?? v.pet?._id ?? null)?.toString?.() ?? null;

  const completedByStr =
    typeof v.completedBy === "string"
      ? v.completedBy
      : v.completedBy?.characterName ??
        v.completedBy?.username ??
        v.completedBy?.discordId ??
        v.completed_by?.characterName ??
        v.completed_by?.username ??
        v.completed_by?.discordId ??
        null;

  return {
    id: String(v.id ?? v._id ?? ""),
    status: "COMPLETED",
    petId,
    petName: String(v.petName ?? v.pet_name ?? v.pet?.name ?? "Unknown"),
    petSpecies: String(v.petSpecies ?? v.pet_species ?? v.pet?.species ?? "Unknown"),
    petBreed: v.petBreed ?? v.pet_breed ?? v.pet?.breed ?? null,
    petAge: v.petAge ?? v.pet_age ?? v.pet?.age ?? null,

    applicant: v.purchaserName ?? v.playerName ?? v.player_name ?? null,
    phone: v.phone ?? v.applicantPhone ?? null,       // lenient mapping
    stateId: v.stateId ?? v.state_id ?? null,         // lenient mapping
    outcome: v.outcome ?? v.completed_outcome ?? null,
    comment: v.comment ?? v.completed_comment ?? null,
    completedAt: v.completedAt ?? v.completed_at ?? null,
    completedBy: completedByStr,
    photos: Array.isArray(v.photos) ? v.photos : [],
  };
}

/* =========================
   Page
========================= */
export default function EmployeePage() {
  return <EmployeeUI />;
}

function EmployeeUI() {
  const [pending, setPending] = React.useState<UIPendingVisit[]>([]);
  const [reviews, setReviews] = React.useState<UICompletedVisit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [reviewing, setReviewing] = React.useState<UIPendingVisit | null>(null);

  // Search for Existing Reviews
  const [search, setSearch] = React.useState("");

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [p, c] = await Promise.all([
        fetch("/api/visits?scope=pending", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/visits?scope=completed", { cache: "no-store" }).then((r) => r.json()),
      ]);

      const pList: UIPendingVisit[] = Array.isArray(p?.visits) ? p.visits.map(toUIPending) : [];
      const cList: UICompletedVisit[] = Array.isArray(c?.visits) ? c.visits.map(toUICompleted) : [];

      setPending(pList);
      setReviews(cList);
    } catch {
      setErr("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  function toast(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(null), 2200);
  }

  async function submitReview(payload: {
    visitId: string;
    outcome: "PASS" | "FAIL";
    comment: string;
    pdBackgroundCheck: boolean;  // <-- NEW
  }) {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/employee/visits/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await safeText(r));
      toast(`Review submitted: ${payload.outcome}`);
      setReviewing(null);
      await refresh();
    } catch {
      setErr("Failed to submit review");
    } finally {
      setSaving(false);
    }
  }

  // Hide only if a PASS already exists for that pet; allow re-queue after FAIL
  const pendingFiltered = React.useMemo(() => {
    const passedKeys = new Set(
      (reviews ?? [])
        .filter((r) => r.outcome === "PASS")
        .map((r) => (r.petId && r.petId.length ? `id:${r.petId}` : `name:${r.petName}`))
    );
    return (pending ?? []).filter((v) => {
      if (v._outcome) return false;
      const key = v.petId && v.petId.length ? `id:${v.petId}` : `name:${v.petName}`;
      return !passedKeys.has(key);
    });
  }, [pending, reviews]);

  // Reviews search filter
  const reviewsFiltered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const fields = [
        r.petName,
        r.petSpecies,
        r.petBreed ?? "",
        r.applicant ?? "",
        r.completedBy ?? "",
        r.outcome ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });
  }, [reviews, search]);

  return (
    <main className="container" style={{ display: "grid", gap: 20 }}>
      <header className="sectionHead" style={{ marginTop: 6 }}>
        <h1 className="h1">Home Visit Reviews</h1>
        <div className="user" style={{ gap: 8 }}>
          <button className="btn" onClick={refresh} disabled={loading || saving}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </header>

      {msg && (
        <div className="card" role="status">
          <strong style={{ marginRight: 6 }}>✓</strong> {msg}
        </div>
      )}
      {err && (
        <div className="card" role="alert" style={{ borderColor: "rgba(255,110,110,.35)" }}>
          <strong style={{ marginRight: 6 }}>!</strong> {err}
        </div>
      )}

      {/* Pending (Open/Claimed) */}
      <section style={{ display: "grid", gap: 10 }}>
        <div className="sectionHead" style={{ margin: 0 }}>
          <h2 className="h2">Pending Home Visits</h2>
          <span className="muted">{pendingFiltered.length} total</span>
        </div>

        {loading ? (
          <p className="muted">Loading pending…</p>
        ) : pendingFiltered.length === 0 ? (
          <p className="muted">No pending home visits.</p>
        ) : (
          <ul className="list">
            {pendingFiltered.map((v) => (
              <li key={v.id} className="card rowCard">
                {/* Pet image (if any) */}
                {v.petPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.petPhotoUrl}
                    alt=""
                    className="petThumb"
                  />
                ) : (
                  <div className="petThumb petThumb--placeholder" aria-hidden />
                )}

                {/* Rows of fields */}
                <div className="rows">
                  <div className="row">
                    <span className="label">Pet</span>
                    <span className="value title">{v.petName}</span>
                  </div>

                  <div className="row">
                    <span className="label">Species</span>
                    <span className="value">{v.petSpecies}</span>
                  </div>

                  {v.petBreed && (
                    <div className="row">
                      <span className="label">Breed</span>
                      <span className="value">{v.petBreed}</span>
                    </div>
                  )}

                  {v.petAge && (
                    <div className="row">
                      <span className="label">Age</span>
                      <span className="value">{v.petAge}</span>
                    </div>
                  )}

                  {v.applicant && (
                    <div className="row">
                      <span className="label">Applicant</span>
                      <span className="value">{v.applicant}</span>
                    </div>
                  )}

                  {v.phone && (
                    <div className="row">
                      <span className="label">Phone</span>
                      <span className="value">{v.phone}</span>
                    </div>
                  )}

                  {v.stateId && (
                    <div className="row">
                      <span className="label">State ID</span>
                      <span className="value">{v.stateId}</span>
                    </div>
                  )}

                  {v.scheduledAtUtc && (
                    <div className="row">
                      <span className="label">Scheduled</span>
                      <span className="value">{formatLocal(v.scheduledAtUtc)}</span>
                    </div>
                  )}

                  {v.locationNote && (
                    <div className="row">
                      <span className="label">Location</span>
                      <span className="value clamp1" title={v.locationNote}>
                        {v.locationNote}
                      </span>
                    </div>
                  )}

                  {v._claimedById && (
                    <div className="row">
                      <span className="label">Status</span>
                      <span className="value chip chip--ok">Claimed</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="actions">
                  <button
                    className="btn btn--primary"
                    onClick={() => setReviewing(v)}
                    disabled={saving}
                  >
                    Do the review
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Existing Reviews (Completed) */}
      <section style={{ display: "grid", gap: 10 }}>
        <div className="sectionHead" style={{ margin: 0, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
            <h2 className="h2">Existing Reviews</h2>
            <span className="muted">{reviewsFiltered.length} shown</span>
          </div>
          <input
            className="input"
            placeholder="Search by pet, applicant, reviewer, or outcome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="muted">Loading reviews…</p>
        ) : reviewsFiltered.length === 0 ? (
          <p className="muted">No reviews match your search.</p>
        ) : (
          <ul className="grid">
            {reviewsFiltered.map((r) => (
              <li key={r.id} className="card" style={{ display: "grid", gap: 10 }}>
                <div className="titleRow">
                  <span className="title">{r.petName}</span>
                  <span className={`badge ${r.outcome === "PASS" ? "badge--ok" : "badge--warn"}`}>
                    {r.outcome ?? "Completed"}
                  </span>
                </div>

                <div className="muted">
                  {r.petSpecies}
                  {r.petBreed ? ` • ${r.petBreed}` : ""}
                  {r.petAge ? ` • ${r.petAge}` : ""}
                </div>

                <div className="muted">
                  Reviewer: {r.completedBy ?? "—"}
                  {r.completedAt ? ` • ${formatLocal(r.completedAt)}` : ""}
                </div>

                {r.applicant && (
                  <div className="muted">Applicant: {r.applicant}</div>
                )}

                {r.phone && (
                  <div className="muted">Phone: {r.phone}</div>
                )}

                {r.stateId && (
                  <div className="muted">State ID: {r.stateId}</div>
                )}

                {r.comment && <div style={{ whiteSpace: "pre-wrap" }}>{r.comment}</div>}

                {Array.isArray(r.photos) && r.photos.length > 0 && <PhotoThumbs urls={r.photos} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewing && (
        <ReviewModal
          visit={reviewing}
          saving={saving}
          onClose={() => setReviewing(null)}
          onSubmit={(p) => submitReview(p)}
        />
      )}

      {/* Scoped styles */}
      <style jsx>{`
        .list {
          display: grid;
          gap: 12px;
        }
        .rowCard {
          display: grid;
          grid-template-columns: 90px 1fr auto;
          align-items: stretch;
          gap: 12px;
          padding: 12px;
        }
        .petThumb {
          width: 90px;
          height: 90px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
        }
        .petThumb--placeholder {
          display: block;
        }
        .rows {
          display: grid;
          gap: 8px;
        }
        .row {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 10px;
          align-items: center;
        }
        .label {
          color: var(--muted);
          font-size: 12px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .value {
          color: var(--text);
        }
        .title {
          font-weight: 800;
          font-size: 16px;
        }
        .actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
        }
        .chip--ok {
          background: rgba(80, 200, 120, 0.18);
          border-color: rgba(80, 200, 120, 0.35);
          color: #d7ffe5;
        }
        @media (max-width: 780px) {
          .rowCard {
            grid-template-columns: 70px 1fr;
          }
          .actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
          .row {
            grid-template-columns: 1fr;
            align-items: start;
          }
          .petThumb, .petThumb--placeholder {
            width: 70px;
            height: 70px;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================
   Review Modal (adds PD background check)
========================= */
function ReviewModal({
  visit,
  saving,
  onClose,
  onSubmit,
}: {
  visit: UIPendingVisit;
  saving: boolean;
  onClose: () => void;
  onSubmit: (p: { visitId: string; outcome: "PASS" | "FAIL"; comment: string; pdBackgroundCheck: boolean }) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [outcome, setOutcome] = React.useState<"PASS" | "FAIL">("PASS");
  const [comment, setComment] = React.useState("");
  const [pdChecked, setPdChecked] = React.useState(false); // <-- NEW
  const textRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => textRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) && comment.trim().length > 3 && pdChecked && !saving) {
        handleSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, comment, pdChecked, saving]);

  const canSubmit = comment.trim().length > 3 && pdChecked && !saving;
  const handleSubmit = () =>
    onSubmit({
      visitId: visit.id,
      outcome,
      comment: comment.trim(),
      pdBackgroundCheck: true, // <-- IMPORTANT: send to API
    });

  if (!mounted) return null;

  return createPortal(
    <div className="modalWrap" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()} role="document">
        <div className="modalChrome" />

        <div className="modalHead">
          <div className="modalTitle">
            <h3 className="h3">Home Visit Review</h3>
            <span className="muted">
              {visit.petName} • {visit.petSpecies}
              {visit.petBreed ? ` • ${visit.petBreed}` : ""}
              {visit.petAge ? ` • ${visit.petAge}` : ""}
            </span>
          </div>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close" disabled={saving}>
            ✕
          </button>
        </div>

        <div className="formGrid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field">
            <span className="label">Outcome</span>
            <div className="seg" role="tablist" aria-label="Outcome">
              <button
                type="button"
                className={`seg__btn ${outcome === "PASS" ? "seg__btn--active" : ""}`}
                onClick={() => setOutcome("PASS")}
                aria-pressed={outcome === "PASS"}
              >
                PASS
              </button>
              <button
                type="button"
                className={`seg__btn ${outcome === "FAIL" ? "seg__btn--active" : ""}`}
                onClick={() => setOutcome("FAIL")}
                aria-pressed={outcome === "FAIL"}
              >
                FAIL
              </button>
            </div>
          </div>

          <label className="field">
            <span className="label">Comments (required)</span>
            <textarea
              ref={textRef}
              className="input"
              rows={6}
              placeholder={`Explain why this is a ${outcome}. Environment, temperament, documents, safety, etc.`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </label>

          <label className="field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={pdChecked}
              onChange={(e) => setPdChecked(e.target.checked)}
              aria-label="Background check with PD completed"
            />
            <span className="label" style={{ textTransform: "none" }}>
              Background check with PD completed?
            </span>
          </label>
        </div>

        <div className="modalActions">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Saving…" : "Submit Review"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modalWrap { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: start center; padding: 10vh 16px; background:
          radial-gradient(900px 500px at 20% -10%, rgba(124,156,255,.15), transparent 55%),
          rgba(0,0,0,.6); backdrop-filter: blur(10px) saturate(120%); animation: fadeIn .18s ease forwards; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modalCard { width: min(760px, 94vw); border-radius: 16px; border: 1px solid rgba(255,255,255,.1);
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03)); box-shadow: 0 24px 60px rgba(0,0,0,.55), var(--ring);
          color: var(--text); transform: translateY(10px) scale(.98); opacity: 0; animation: popIn .2s ease forwards; }
        @keyframes popIn { to { transform: translateY(0) scale(1); opacity: 1 } }
        .modalChrome { height: 4px; border-top-left-radius: 16px; border-top-right-radius: 16px;
          background: linear-gradient(90deg, var(--brand), var(--brand-2)); }
        .modalHead { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 8px; }
        .modalTitle { display: grid; gap: 2px; }
        .h3 { font-size: 16px; font-weight: 900; margin: 0; }
        .iconBtn { border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: var(--text);
          padding: 6px 10px; border-radius: 10px; cursor: pointer; }
        .iconBtn:hover { background: rgba(255,255,255,.12); }
        .formGrid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; padding: 12px 14px 2px; }
        .field { display: grid; gap: 6px; }
        .label { color: var(--muted); font-size: 12px; }
        .seg { display: inline-flex; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.05); }
        .seg__btn { padding: 8px 12px; color: var(--text); background: transparent; border: 0; cursor: pointer; }
        .seg__btn + .seg__btn { border-left: 1px solid rgba(255,255,255,.12); }
        .seg__btn--active { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #0b1020; font-weight: 700; }
        .input { padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06); color: var(--text); outline: none; transition: border-color .15s, box-shadow .15s, background .15s; }
        .input:hover { border-color: rgba(255,255,255,.18); }
        .input:focus { border-color: rgba(124,156,255,.55); box-shadow: var(--ring); background: rgba(255,255,255,.08); }
        textarea.input { resize: vertical; min-height: 120px; }
        .modalActions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 14px 14px; margin-top: 12px;
          border-top: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02));
          border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; }
      `}</style>
    </div>,
    document.body
  );
}

/* =========================
   Visual helpers
========================= */
function PhotoThumbs({ urls }: { urls: string[] }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer" style={{ width: 84, height: 84 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={u}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.12)",
            }}
          />
        </a>
      ))}
    </div>
  );
}

/* =========================
   Utils
========================= */
function formatLocal(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
