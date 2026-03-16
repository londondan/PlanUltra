import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "PlanUltra",
  description: "Ultra marathon race planning for serious runners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable}`}>
      <body className="antialiased min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <polygon points="8,1 15,15 1,15" fill="#1D7CBE" />
              </svg>
              <span className="text-lg font-bold text-foreground font-display" style={{ letterSpacing: '-0.03em' }}>PlanUltra</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-medium text-primary hover:opacity-70 transition-opacity">
                Dashboard
              </Link>
              <UserMenu />
            </nav>
          </div>
        </header>
        <main className="container mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
