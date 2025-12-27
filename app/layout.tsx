import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeScript } from "./theme-script"
import "./globals.css"

const siteConfig = {
  name: "stats.store",
  url: "https://stats.store", // Assuming this is your production URL
  ogImage: "/banner.png", // Using the banner.png from the public folder
  description:
    "Fast, open, privacy-first analytics for Sparkle-enabled Mac apps. Free for open source projects and indie developers.",
  author: "Peter Steinberger",
  twitterHandle: "@steipete",
  twitterCardType: "summary_large_image" as const, // Explicitly type for Metadata
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - ${siteConfig.description}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  authors: [{ name: siteConfig.author, url: "https://steipete.me" }],
  creator: siteConfig.author,
  publisher: siteConfig.author,
  generator: "Next.js", // Or "v0.dev" if you prefer
  keywords: ["Sparkle", "macOS", "analytics", "privacy-first", "open source", "app statistics", "developer tools"],
  robots: {
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    index: true,
  },
  openGraph: {
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200, // Assuming your banner.png is around this width
        height: 630, // Assuming your banner.png is around this height for optimal OG aspect ratio
        alt: `${siteConfig.name} - ${siteConfig.description}`,
      },
    ],
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: siteConfig.url,
  },
  twitter: {
    card: siteConfig.twitterCardType,
    title: siteConfig.name,
    description: siteConfig.description,
    site: siteConfig.twitterHandle, // Your site's Twitter handle (optional)
    creator: siteConfig.twitterHandle, // Your personal/creator Twitter handle
    images: [siteConfig.ogImage],
  },
  icons: {
    apple: "/favicon.png",
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  // Manifest: "/site.webmanifest", // If you have a web app manifest
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === "1" ? <Analytics /> : null}
      </body>
    </html>
  )
}
