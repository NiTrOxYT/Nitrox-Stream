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
  metadataBase: new URL("https://nitrox-stream.vercel.app"),
  title: "NITROX CINEVERSE",
  description: "Experience premium movie, TV show and anime streaming with NITROX CINEVERSE.",
  keywords: ["movies", "tv shows", "anime", "streaming", "cineverse", "nitrox", "cinema", "watch online"],
  openGraph: {
    title: "NITROX CINEVERSE",
    description: "Experience premium movie, TV show and anime streaming with NITROX CINEVERSE.",
    type: "website",
    siteName: "NITROX CINEVERSE",
    images: [
      {
        url: "/cover.png",
        width: 1200,
        height: 630,
        alt: "NITROX CINEVERSE",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NITROX CINEVERSE",
    description: "Experience premium movie, TV show and anime streaming with NITROX CINEVERSE.",
    images: ["/cover.png"],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
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