import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLINCH - hinge-first research for tokenized-stock decisions",
  description:
    "CLINCH finds the unanswered question most likely to change your trading decision, researches it with live market data, and stops when more checking would no longer matter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
