import "./globals.css";
import "./enhancements.css";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://invitacion-50-gabo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Gabo · 50 años",
  description: "Invitación digital para celebrar los 50 años de Gabo en Hacienda de Huaxtla.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true }
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: SITE_URL,
    siteName: "Gabo · 50 años",
    title: "Gabo · 50 años",
    description: "10 de octubre de 2026 · Hacienda de Huaxtla",
    images: [{ url: "/cuban-night-hero.webp", alt: "Gabo celebra 50 años" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Gabo · 50 años",
    description: "10 de octubre de 2026 · Hacienda de Huaxtla",
    images: ["/cuban-night-hero.webp"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
