// src/app/layout.tsx
import "./globals.css";
import Providers from "./providers";
import NavBar from "@/components/NavBar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <header>
        <title>Animal Ark</title>
      </header>
      <body className="site">
        <Providers>
          <NavBar />
          <main className="container">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
