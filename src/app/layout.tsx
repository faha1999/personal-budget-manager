
import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Budget Manager",
    template: "%s · Budget Manager",
  },
  description:
    "A personal finance dashboard for Bangladesh users: track income/expense, accounts, investments, goals, loans, and analytics.",
  applicationName: "Budget Manager",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={inter.variable}
      data-gramm="false"
      data-gramm_editor="false"
      suppressHydrationWarning
    >
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {/* Global background + subtle grain */}
          <div className="min-h-dvh bg-app text-ink antialiased">
            {/* Premium soft background texture (uses CSS variables to follow theme) */}
            <div className="theme-wash pointer-events-none fixed inset-0" aria-hidden />
            <div className="theme-grain pointer-events-none fixed inset-0" aria-hidden />

            {/* App content */}
            <div className="relative">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
