import "./globals.css";
import "./enhancements.css";
import type { Metadata } from "next";
import localFont from "next/font/local";

const editorial = localFont({
  src: [
    { path: "./fonts/CormorantGaramond-Variable.ttf", style: "normal" },
    { path: "./fonts/CormorantGaramond-Italic-Variable.ttf", style: "italic" }
  ],
  variable: "--font-editorial",
  display: "swap"
});

const signature = localFont({
  src: "./fonts/Allura-Regular.ttf",
  variable: "--font-signature",
  display: "swap"
});

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
    images: [{ url: "/gabo-premium-hero.webp", alt: "Gabo celebra 50 años" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Gabo · 50 años",
    description: "10 de octubre de 2026 · Hacienda de Huaxtla",
    images: ["/gabo-premium-hero.webp"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${editorial.variable} ${signature.variable}`}>{children}</body>
    </html>
  );
}
