import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLINCH | Selective AI Trading Desk",
  description:
    "CLINCH finds the question most likely to change a trading decision, researches it with live Bitget data, and stops when more research is unlikely to matter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
