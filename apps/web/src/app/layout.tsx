import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AuthSessionProvider } from "@/components/session-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Referee",
  description: "Hackathon operations",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} min-h-screen font-sans`}>
        <AuthSessionProvider>
          <SiteHeader />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
