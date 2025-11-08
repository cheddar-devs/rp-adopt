"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import Image from "next/image";

export default function NavBarClient({
  isAuthed,
  role,
  username,
  avatarUrl,
}: {
  isAuthed: boolean;
  role: "ADMIN" | "EMPLOYEE" | null;
  username?: string;
  avatarUrl?: string | null;
}) {
  const roleLabel =
    role === "ADMIN" ? "Admin" : role === "EMPLOYEE" ? "Employee" : null;
  const roleClass =
    role === "ADMIN" ? "badge badge--warn" : role === "EMPLOYEE" ? "badge badge--ok" : "badge";

  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link href="/" className="brand">
          <span className="brand__logo">🐾</span>
          <span className="brand__text">Animal Ark Adoption Site</span>
        </Link>

        <div className="links">
          <Link href="/" className="link">Home</Link>
          {isAuthed && <Link href="/employee" className="link">Visit Management</Link>}
          {isAuthed && role === "ADMIN" && (
            <Link href="/admin" className="link">Admin</Link>
          )}
        </div>

        <div className="user">
          {isAuthed ? (
            <>
              {/* avatar */}
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={username ?? "user"}
                  width={28}
                  height={28}
                  className="avatar"
                />
              ) : (
                <span className="avatar avatar--placeholder">
                  {(username ?? "U").slice(0, 1)}
                </span>
              )}

              {/* username + role */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontWeight: 600 }}>{username ?? "User"}</span>
                {roleLabel && <span className={roleClass}>{roleLabel}</span>}
              </div>

              <button className="btn btn--ghost" onClick={() => signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <button className="btn btn--primary" onClick={() => signIn("discord")}>
              Employee Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
