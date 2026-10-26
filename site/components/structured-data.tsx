import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/seo";

// schema.org data so search engines know what eqlShare is: the company, the
// site, and the app. Only facts already stated on the page.
const data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-192.png`,
      email: "support@eqlshare.com",
      sameAs: ["https://www.instagram.com/eqlshare/"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "iOS, Android, macOS, Windows",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export function StructuredData() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
