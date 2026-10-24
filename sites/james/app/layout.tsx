import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Portfolio", template: "%s | Portfolio" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* Dark background sits between neutral-950 (14.5%) and neutral-900 (20.5%). */}
      <body className="bg-white text-neutral-900 antialiased dark:bg-[oklch(17%_0_0)] dark:text-neutral-100">
        <SiteNav />
        {/* Centered column; side padding grows with the screen so content never hugs the edges. */}
        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">{children}</main>
      </body>
    </html>
  );
}
