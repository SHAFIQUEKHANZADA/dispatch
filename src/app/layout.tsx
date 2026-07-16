import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Dispatch — Smarter Dispatch. Happier Customers. Stronger Results.",
  description:
    "The intelligent operating system for fixed operations. Puts the right work on the right tech at the right time — with a Match Score that explains itself.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // System fonts only — no next/font/google — so dev and build never need the
  // network. The app shell lives in the (app) route group; the marketing
  // landing page at "/" renders without it.
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
