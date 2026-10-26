import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/d/" },
    sitemap: "https://www.eqlshare.com/sitemap.xml",
  };
}
