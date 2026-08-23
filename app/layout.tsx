import "./globals.css";
import "./enhancements.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gabo · 50 años",
  description: "Invitación digital para celebrar los 50 años de Gabo en Hacienda de Huaxtla."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
