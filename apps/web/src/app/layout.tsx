import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "ShipFlow AI",
  description: "Enterprise-grade AI-assisted feature delivery platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}