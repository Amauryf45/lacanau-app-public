import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AccessGate from "@/components/restriction";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Lacanau 2026",
  description: "La semaine des 13 à Lacanau — quêtes, défis, photos et potins.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lacanau 2026",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#33a5f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={nunito.variable}>
      <body className="font-sans antialiased">
        <div className="mx-auto max-w-lg min-h-dvh pb-24">
          <AccessGate>{children}</AccessGate>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
