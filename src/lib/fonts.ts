import { Fraunces, Inter } from "next/font/google";

// Display serif — warm, organic character for headings.
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

// Clean body sans.
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
