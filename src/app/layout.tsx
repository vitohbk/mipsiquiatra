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
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-746407741" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer = window.dataLayer || [];" +
              "function gtag(){dataLayer.push(arguments);}" +
              "gtag('js', new Date());" +
              "gtag('config', 'AW-746407741');" +
              "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':" +
              "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0]," +
              "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=" +
              "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
              "})(window,document,'script','dataLayer','GTM-5TZXPBC7');",
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${sourceSans.variable} antialiased`}
      >
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5TZXPBC7"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
