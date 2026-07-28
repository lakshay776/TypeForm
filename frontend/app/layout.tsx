import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

/**
 * Typeform's own typeface is Apercu Pro, which is commercially licensed. Inter is
 * the closest freely available neo-grotesque and matches its metrics and
 * geometric feel closely enough for the UI to read the same.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Typeform Clone",
  description:
    "Build conversational forms one question at a time, publish them with a link, and read the results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * `suppressHydrationWarning` on <html> and <body> only.
     *
     * Browser extensions stamp attributes onto these two elements in the window
     * between the HTML arriving and React hydrating — ColorZilla adds
     * `cz-shortcut-listen`, password managers and Grammarly add their own. React
     * then reports a mismatch for markup this app never rendered.
     *
     * The flag is one level deep: it covers each element's own attributes and
     * direct text, and does *not* silence mismatches in any descendant. So real
     * hydration bugs inside the app are still reported.
     */
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
