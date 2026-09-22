import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Database } from "lucide-react";
import { MobileNav, Sidebar, type NavComponent } from "@/components/app-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { componentLabel } from "@/lib/components-meta";
import { getBuildResults } from "@/lib/data";
import { formatScanTime } from "@/lib/format";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "PC Build Price Finder", template: "%s · PC Build Price Finder" },
  description: "Verified component recommendations and prices for the current PC build configuration.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const results = await getBuildResults();
  const components: NavComponent[] = results.ok
    ? results.data.components.map((c) => ({ key: c.key, label: componentLabel(c.key) }))
    : [];
  const footer = results.ok ? (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5">
        <Database className="size-3" aria-hidden />
        {results.data.source.name}
      </span>
      <span className="tabular">
        Scraper v{results.data.version} · {formatScanTime(results.data.generatedAt).full}
      </span>
    </div>
  ) : null;

  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={200}>
          <div className="flex min-h-dvh">
            <Sidebar components={components} footer={footer} />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileNav components={components} footer={footer} />
              <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
            </div>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
