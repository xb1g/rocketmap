import type { Metadata } from "next";
import { Inter, Crimson_Text, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const crimsonText = Crimson_Text({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RocketMap — Playable Business Model Engine",
  description:
    "Validate assumptions, detect contradictions, and stress-test your startup ideas through AI-powered analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${crimsonText.variable} ${geistMono.variable} antialiased`}
      >
        <Theme
          appearance="dark"
          accentColor="iris"
          grayColor="gray"
          radius="large"
          scaling="100%"
        >
          {children}
        </Theme>
      </body>
    </html>
  );
}
