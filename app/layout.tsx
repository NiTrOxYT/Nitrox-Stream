import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Nitrox Stream",
  description: "Premium Streaming Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${geistSans.variable} min-h-screen bg-background text-white antialiased`}>
        <Navbar />
        <div className="pt-[64px]">
          {children}
        </div>
      </body>
    </html>
  );
}