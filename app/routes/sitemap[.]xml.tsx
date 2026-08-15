import { SITE_URL } from "~/lib/seo";

const publicRoutes = ["/", "/contact", "/privacy", "/terms"];

export const loader = () => {
  const urls = publicRoutes
    .map(
      (route) => `<url>
  <loc>${SITE_URL}${route}</loc>
  <changefreq>${route === "/" ? "weekly" : "monthly"}</changefreq>
  <priority>${route === "/" ? "1.0" : "0.7"}</priority>
</url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
};
