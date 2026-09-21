import type { MetadataRoute } from 'next';
import { ALL_TOOLS } from '@/lib/tools-data';
import { SITE_URL } from '@/lib/site';

/**
 * Framework-native XML sitemap.
 * Public, indexable pages only: homepage, tools index, every tool landing
 * page, and the supporting public pages. User-specific app states
 * (workspace, settings) and API routes are excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/tools`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/install`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const toolPages: MetadataRoute.Sitemap = ALL_TOOLS.map((tool) => ({
    url: `${SITE_URL}/tools/${tool.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: tool.popular ? 0.9 : 0.8,
  }));

  return [...staticPages, ...toolPages];
}
