import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { SeasonProvider } from "@/components/SeasonProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "L.E.G.E.N.D.S. | Dynasty Fantasy Football",
  description:
    "League of Extraordinary Gentlemen Excelling in NFL Dynasty Success — 10-team Superflex TE-Premium Dynasty League",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="gradient-mesh pointer-events-none fixed inset-0 -z-10" />
        <SeasonProvider>
          <Navigation />
          <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 md:pb-8">
            {children}
          </main>
          <Footer />
        </SeasonProvider>
      </body>
    </html>
  );
}
