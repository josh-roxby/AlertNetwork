import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

// Inline before-paint script: sets data-theme on <html> based on the stored
// preference, or the system color-scheme on first launch. Runs sync so light
// users never see a dark flash.
const themeBootstrap = `
(function(){
  try {
    var s = localStorage.getItem('anw-theme');
    var t = s === 'light' || s === 'dark'
      ? s
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${unbounded.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full bg-bg text-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
