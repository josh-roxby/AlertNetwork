import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alert Network",
  description:
    "Social account monitoring and observability for sponsorship teams.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
