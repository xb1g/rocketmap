import type { Metadata } from "next";
import { Lexend_Deca, Cormorant, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

const lexendDeca = Lexend_Deca({
  variable: "--font-body",
  subsets: ["latin"],
});

const cormorant = Cormorant({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RocketMap — Playable Business Model Engine",
  description: "Validate assumptions, detect contradictions, and stress-test your startup ideas through AI-powered analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lexendDeca.variable} ${cormorant.variable} ${geistMono.variable} antialiased`}
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
