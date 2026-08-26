import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropConnect",
  description:
    "WhatsApp-first real estate lead-to-viewing platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
