import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexa Core",
  description: "Gestión interna de clientes, cobros y gastos — Nexa Consulting TI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${manrope.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
