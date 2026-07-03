import type { Metadata } from "next";
import { Inter } from "next/font/google";
// Suppress TS error when project lacks a declaration for CSS side-effect imports
// @ts-ignore: CSS module declaration not found in this environment
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nitrox Stream",
  description: "Premium Streaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}