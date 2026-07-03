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
  title: "NITROX CINEVERSE",
  description: "Experience premium movie and TV streaming with an elegant cinematic interface. Discover thousands of movies, TV shows, anime, and episodes in one beautifully designed streaming platform.",
  keywords: ["movies", "tv shows", "anime", "streaming", "cineverse", "nitrox", "cinema", "watch online"],
  openGraph: {
    title: "NITROX CINEVERSE",
    description: "Experience premium movie and TV streaming with an elegant cinematic interface. Discover thousands of movies, TV shows, anime, and episodes in one beautifully designed streaming platform.",
    type: "website",
    siteName: "NITROX CINEVERSE",
  },
  twitter: {
    card: "summary_large_image",
    title: "NITROX CINEVERSE",
    description: "Experience premium movie and TV streaming with an elegant cinematic interface. Discover thousands of movies, TV shows, anime, and episodes in one beautifully designed streaming platform.",
  }
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