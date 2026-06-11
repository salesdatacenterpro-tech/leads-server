import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevoirsGame — Apprends en jouant",
  description: "Transforme les devoirs de ton enfant en jeux amusants.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen font-display text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
