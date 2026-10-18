import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, THEMES } from "@/lib/site";
import { AVAILABLE_TOOLS } from "@/lib/tools";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteChrome } from "@/components/layout/site-chrome";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteToaster } from "@/components/layout/site-toaster";
import { CommandMenu } from "@/components/organisms/command-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const FULL_SCREEN_PATHS = AVAILABLE_TOOLS.filter((tool) => tool.fullScreen).map(
  (tool) => tool.href,
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Only the dev and text tools set anything in monospace, so it is not worth
  // competing with the page's own content for bandwidth on every route.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: Free local tools`,
    // Tool pages set just their own name and inherit the rest.
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME}: Free local tools`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: Free local tools`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      suppressHydrationWarning
      className={cn(
        geistSans.variable,
        geistMono.variable,
        "h-full antialiased",
      )}
    >
      <body className="min-h-full">
        <a
          href="#main"
          className="bg-background focus:ring-ring sr-only rounded-md border px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:ring-2 focus:outline-none"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          themes={[...THEMES]}
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={300}>
            <SiteChrome
              fullScreenPaths={FULL_SCREEN_PATHS}
              sidebar={<AppSidebar />}
              header={<SiteHeader />}
            >
              {children}
            </SiteChrome>
            <CommandMenu />
          </TooltipProvider>
          <SiteToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
