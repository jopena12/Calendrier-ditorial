import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calendrier Éditorial KMI",
  description:
    "Outil interne de génération et de planification de contenu social media multi-marques.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
