import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/management/', '/venue-login/'],
    },
    sitemap: 'https://yabalitsa.com/sitemap.xml',
  };
}
