import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import { PushInit } from "@/components/native/push-init";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zinda",
  description: "Track your life goals with spiritual motivation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zinda",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b", // zinc-950 equivalent for dark mode
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${fraunces.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <PushInit />
          {children}
        </Providers>
      </body>
    </html>
  );
}
