import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app/', '/app', '/c', '/s', '/onboarding'] }],
    sitemap: 'https://unbilled.app/sitemap.xml',
  };
}
