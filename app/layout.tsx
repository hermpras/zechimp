import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZECHIMP WL Campaign",
  description: "Technical foundation for the ZECHIMP whitelist campaign.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
