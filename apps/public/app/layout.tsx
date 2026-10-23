import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Portfolio", template: "%s | Portfolio" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-3xl px-4 py-8">
        <nav className="mb-8 flex gap-4">
          <Link href="/">Home</Link>
          <Link href="/projects/">Projects</Link>
          <Link href="/about/">About</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
