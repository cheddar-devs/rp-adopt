// src/app/components/ScheduleVisitButton.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type Props = { petId: string; petName: string };

export default function ScheduleVisitButton({ petId, petName }: Props) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const [stateId, setStateId] = React.useState("");
  const [purchaserName, setPurchaserName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [visitAt, setVisitAt] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const firstInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => firstInputRef.current?.focus(), 30);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = prev;
      };
    }
  }, [open, mounted]);

  function close() {
    setOpen(false);
    setError(null);
    setOk(null);
  }

  // === Time Conversion ===
  function localDatetimeToUtcIso(local: string): string | null {
    if (!local) return null;
    const [datePart, timePart] = local.split("T");
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  }

  function getClientTimezoneInfo() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const offsetMinutes = new Date().getTimezoneOffset();
    return { tz, offsetMinutes };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!stateId.trim() || !purchaserName.trim() || !phone.trim() || !visitAt) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[0-9+()\-.\s]{7,20}$/.test(phone)) {
    setError("Please enter a valid phone number.");
    return;
  }

    const visitAtUtc = localDatetimeToUtcIso(visitAt);
    if (!visitAtUtc) {
      setError("Invalid date/time.");
      return;
    }
    const { tz, offsetMinutes } = getClientTimezoneInfo();

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/visits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId,
          stateId: stateId.trim(),
          purchaserName: purchaserName.trim(),
          phone: phone.trim(),
          visitAtLocal: visitAt,
          visitAtUtc,
          tz,
          tzOffsetMinutes: offsetMinutes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to schedule visit.");
      }

      setOk("Home visit scheduled!");
      setStateId("");
      setPurchaserName("");
      setPhone("");
      setVisitAt("");
      setTimeout(() => close(), 600);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>
        Schedule home visit
      </button>

      {mounted && open &&
        createPortal(
          <div className="modalWrap" role="dialog" aria-labelledby="visit-title" aria-modal="true" onMouseDown={close}>
            <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modalChrome" />
              <div className="modalHead">
                <div className="modalTitle">
                  <h3 id="visit-title" className="h3">Schedule home visit</h3>
                  <span className="muted">for <strong className="title">{petName}</strong></span>
                </div>
                <button type="button" className="iconBtn" onClick={close} aria-label="Close" disabled={submitting}>✕</button>
              </div>

              <form onSubmit={onSubmit}>
                <div className="formGrid">
                  <label className="field">
                    <span className="label">State ID</span>
                    <input
                      ref={firstInputRef}
                      className="input"
                      type="text"
                      value={stateId}
                      onChange={(e) => setStateId(e.target.value)}
                      placeholder="e.g. CA-DL 1234567"
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="label">Purchaser name</span>
                    <input
                      className="input"
                      type="text"
                      value={purchaserName}
                      onChange={(e) => setPurchaserName(e.target.value)}
                      placeholder="Full legal name"
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="label">Phone number</span>
                    <input
                      className="input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 555-5555"
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="label">Visit date & time</span>
                    <input
                      className="input"
                      type="datetime-local"
                      value={visitAt}
                      onChange={(e) => setVisitAt(e.target.value)}
                      required
                    />
                  </label>
                </div>

                {error && <p className="callout callout--error">{error}</p>}
                {ok && <p className="callout callout--ok">{ok}</p>}

                <div className="modalActions">
                  <button type="button" className="btn btn--ghost" onClick={close} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={submitting}>
                    {submitting ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>

            <style jsx>{`
              .modalWrap {
                position: fixed;
                inset: 0;
                display: grid;
                place-items: start center;
                padding: 10vh 16px;
                background:
                  radial-gradient(900px 500px at 20% -10%, rgba(124,156,255,.15), transparent 55%),
                  rgba(0,0,0,.6);
                backdrop-filter: blur(10px) saturate(120%);
                animation: fadeIn .18s ease forwards;
                z-index: 1000;
              }
              @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

              .modalCard {
                width: min(640px, 92vw);
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,.1);
                background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
                box-shadow: 0 24px 60px rgba(0,0,0,.55), var(--ring);
                color: var(--text);
                transform: translateY(10px) scale(.98);
                opacity: 0;
                animation: popIn .2s ease forwards;
              }
              @keyframes popIn { to { transform: translateY(0) scale(1); opacity: 1; } }

              .modalChrome {
                height: 4px;
                border-top-left-radius: 16px;
                border-top-right-radius: 16px;
                background: linear-gradient(90deg, var(--brand), var(--brand-2));
              }

              .modalHead {
                display: flex; align-items: center; justify-content: space-between;
                padding: 14px 14px 8px;
              }
              .modalTitle { display: grid; gap: 2px; }
              .h3 { font-size: 16px; font-weight: 900; margin: 0; }
              .title { font-weight: 800; }

              .iconBtn {
                border: 1px solid rgba(255,255,255,.16);
                background: rgba(255,255,255,.06);
                color: var(--text);
                padding: 6px 10px;
                border-radius: 10px;
                cursor: pointer;
              }
              .iconBtn:hover { background: rgba(255,255,255,.12); }

              .formGrid {
                display: grid;
                gap: 12px;
                grid-template-columns: 1fr 1fr;
                padding: 12px 14px 2px;
              }
              @media (max-width: 640px) { .formGrid { grid-template-columns: 1fr; } }

              .field { display: grid; gap: 6px; }
              .label { color: var(--muted); font-size: 12px; }

              .input {
                padding: 10px 12px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,.12);
                background: rgba(255,255,255,.06);
                color: var(--text);
                outline: none;
                transition: border-color .15s, box-shadow .15s, background .15s;
              }
              .input:hover { border-color: rgba(255,255,255,.18); }
              .input:focus {
                border-color: rgba(124,156,255,.55);
                box-shadow: var(--ring);
                background: rgba(255,255,255,.08);
              }

              .callout {
                margin: 10px 14px 0;
                padding: 10px 12px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,.12);
                font-size: 13px;
              }
              .callout--error {
                background: rgba(220,38,38,.12);
                color: #ffd7d7;
                border-color: rgba(220,38,38,.28);
              }
              .callout--ok {
                background: rgba(52,211,153,.12);
                color: #caffea;
                border-color: rgba(52,211,153,.28);
              }

              .modalActions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px 14px 14px;
                margin-top: 12px;
                border-top: 1px solid rgba(255,255,255,.08);
                background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02));
                border-bottom-left-radius: 16px;
                border-bottom-right-radius: 16px;
              }

              .btn--sm { padding: 6px 10px; font-size: 13px; }
            `}</style>
          </div>,
          document.body
        )}
    </>
  );
}
