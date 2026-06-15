import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
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

const themeScript = `
  (function () {
    try {
      var stored = localStorage.getItem('og-golf-theme');
      var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-golf-cream text-golf-green-900 dark:bg-[#0f3d24] dark:text-golf-cream antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}