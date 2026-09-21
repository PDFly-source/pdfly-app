import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static'; // Required for static export (output: 'export').

/**
 * robots.txt — allows standard search crawlers (Googlebot, Bingbot),
 * AI search crawlers (OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot),
 * and DuckDuckGo, while keeping private app state and API routes out of
 * search indexes. PDF contents never leave the user's device, and there
 * are no server-hosted user files, so nothing sensitive is exposed.
 */
export default function robots(): MetadataRoute.Robots {
  const allowPublic = {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/workspace', '/settings'],
      },
      // Explicit allow for AI/search discovery crawlers
      {
        userAgent: [
          'OAI-SearchBot',
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Googlebot',
          'Bingbot',
          'DuckDuckBot',
        ],
        allow: '/',
        disallow: ['/api/', '/workspace', '/settings'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
  return allowPublic;
}
