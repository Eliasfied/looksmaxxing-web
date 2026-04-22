import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PostHogProvider } from "@/components/posthog-provider";
import { appConfig } from "@/lib/config";
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
  metadataBase: new URL(appConfig.brand.appUrl),
  title: {
    default: appConfig.seo.defaultTitle,
    template: `%s | ${appConfig.brand.name}`,
  },
  description: appConfig.seo.defaultDescription,
  openGraph: {
    title: appConfig.seo.defaultTitle,
    description: appConfig.seo.defaultDescription,
    url: appConfig.brand.appUrl,
    siteName: appConfig.brand.name,
    images: [
      {
        url: `${appConfig.brand.marketingUrl}${appConfig.seo.ogImage}`,
        width: 1200,
        height: 630,
        alt: appConfig.seo.defaultTitle,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: appConfig.seo.defaultTitle,
    description: appConfig.seo.defaultDescription,
    images: [`${appConfig.brand.marketingUrl}${appConfig.seo.ogImage}`],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
