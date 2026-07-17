import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { StoreProvider } from "./store";
import BottomNav from "@/components/BottomNav";

// Display serif with real personality (carries headings + the hero number);
// clean grotesk body that is deliberately NOT Inter/system default.
// next/font self-hosts both — no runtime requests to Google.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calorie Tracker",
  description: "Track your daily calorie intake against a budget, with weekly and monthly stats.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Calories" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1e9" },
    { media: "(prefers-color-scheme: dark)", color: "#12140e" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <StoreProvider>
          <div className="app-shell">
            <main className="app-main">{children}</main>
            <BottomNav />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
