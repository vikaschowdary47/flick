import type { Metadata } from "next";

// One place for SEO: the site URL, default copy, and per-page metadata.
// Every page sets its own canonical URL and link-preview text; without this,
// Next.js inherits the layout's homepage canonical on every page, which tells
// search engines the legal pages are duplicates of the homepage.

export const SITE_URL = "https://www.eqlshare.com";
export const SITE_NAME = "eqlShare";
export const DEFAULT_TITLE = "eqlShare: Send files between your phone and laptop";
export const DEFAULT_DESCRIPTION =
  "Send photos, files and clips from your phone to your laptop in seconds. For iPhone, Android, Mac and Windows. Files delete themselves after 24 hours.";

export function pageMetadata({
  title,
  description,
  path,
}: {
  title?: string; // page title; the layout template adds " · eqlShare"
  description: string;
  path: string; // "/" or "/privacy"
}): Metadata {
  const shareTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shareTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
    },
  };
}
