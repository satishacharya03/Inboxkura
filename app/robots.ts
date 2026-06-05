import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/privacy', '/terms', '/deletion', '/docs/connection'],
      disallow: ['/api/', '/dashboard/', '/settings/', '/onboarding/', '/create-organization/', '/invite/'],
    },
    sitemap: 'https://inboxkura.vercel.app/sitemap.xml',
  };
}
