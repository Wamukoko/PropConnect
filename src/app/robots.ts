import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qabila.co.ke";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/login",
          "/settings/",
          "/campaigns/",
          "/analytics/",
          "/system-health/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
