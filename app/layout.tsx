import type { Metadata } from "next";
import "./globals.css";
import "./fieldflow-v08.css";

export const metadata: Metadata = {
  title: "Nexus",
  description: "Modular field operations software for real businesses.",
  icons: {
    icon: "/brand/icon-192.png",
    apple: "/brand/icon-192.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
