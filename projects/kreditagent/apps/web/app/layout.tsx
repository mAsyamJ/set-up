import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KreditAgent Demo",
  description: "ERC-8004 + x402 MSME credit reputation demo"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
