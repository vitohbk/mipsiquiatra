import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = localFont({
  src: [{ path: "../../public/fonts/PlayfairDisplay-400.ttf", weight: "400", style: "normal" }],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSans = localFont({
  src: [
    { path: "../../public/fonts/SourceSansPro-300.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/SourceSansPro-400.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/SourceSansPro-600.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inicio - Mi Psiquiatra",
  description: "Caminos Difíciles, llevan a Lugares Hermosos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${sourceSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
