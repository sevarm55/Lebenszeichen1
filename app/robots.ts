import type { MetadataRoute } from 'next'

import { siteConfig } from '@/config/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /suche produces near-infinite thin pages; /admin and /api must never
        // be crawled at all.
        disallow: ['/admin', '/admin/', '/api/', '/suche', '/vorschau/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
