import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { PushInit } from "@/components/native/push-init";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Improve font loading performance
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
        className={`${geistSans.variable} antialiased bg-background text-foreground`}
      >
        <PushInit />
        {children}
      </body>
    </html>
  );
}
