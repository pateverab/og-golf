import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OG Golf",
  description: "OG Golf — Track. Improve. Own the Course. Fast, private golf score tracking.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OG Golf",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f3d24",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f3d24] text-[#f5f3eb] antialiased">
        {children}
      </body>
    </html>
  );
}
