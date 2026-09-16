import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CLINCH | Selective AI Trading Desk",
  description:
    "CLINCH finds the question most likely to change a trading decision, researches it with live Bitget data, and stops when more research is unlikely to matter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const proxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
  const content = publishableKey
    ? <ClerkProvider publishableKey={publishableKey} proxyUrl={proxyUrl} dynamic>{children}</ClerkProvider>
    : children;
  return (
    <html lang="en">
      <body className={inter.variable}>{content}</body>
    </html>
  );
}
