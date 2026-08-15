import { SITE_URL } from "~/lib/seo";

export const loader = () => {
  const robots = `User-agent: *
Allow: /
Disallow: /auth/
Disallow: /api/
Disallow: /onboarding
Disallow: /payments/verify
Disallow: /delete-account-confirmation
Disallow: /health
Disallow: /dashboard

Sitemap: ${SITE_URL}/sitemap.xml`;
  return new Response(robots, {
    headers: { "Content-Type": "text/plain" },
  });
};
