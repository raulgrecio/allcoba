import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@allcoba/ui";
import { NextLinkProvider } from "../components/providers/NextLinkProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Allcoba — Conecta sin exponerte",
    template: "%s | Allcoba",
  },
  description:
    "Encuentra y conecta con proveedores de servicios de forma privada y segura. Dating, automoción y mucho más.",
  keywords: ["marketplace", "servicios", "privacidad", "España"],
  openGraph: {
    siteName: "Allcoba",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <NextLinkProvider>
          {children}
        </NextLinkProvider>
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
