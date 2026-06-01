# PWA Icons for OG Golf

This folder should contain the following PNG icons for the PWA manifest and iOS support:

- icon-192.png (192x192 pixels)
- icon-512.png (512x512 pixels)
- apple-touch-icon.png (180x180 pixels recommended for iOS)

## Recommended generation
- Use a square logo with transparent or solid golf-green background (#0f3d24) and gold accent (#c5a36f).
- Export as PNG with no padding for best results.
- You can use tools like https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator for easy generation.

## Current manifest references
The app/manifest.ts references:
- /icons/icon-192.png
- /icons/icon-512.png

The layout.tsx references apple-touch-icon at /icons/apple-touch-icon.png

Replace these placeholders with real icons before deploying for production PWA install.

For development/testing, the app will still function as a PWA if the icons are missing (browsers will fallback), but install prompts may look incomplete.
