// src/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // You can pass session here if you ever fetch it on the server,
  // but for now the default is fine.
  return <SessionProvider>{children}</SessionProvider>;
}
