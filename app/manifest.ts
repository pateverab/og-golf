import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OG Golf',
    short_name: 'OG Golf',
    description: 'OG Golf — Track. Improve. Own the Course.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f3d24',
    theme_color: '#c5a36f',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
