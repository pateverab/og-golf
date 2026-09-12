import type { MetadataRoute } from "next";

/**
 * Single source of truth for the web app manifest (served at /manifest.webmanifest).
 * Do not add a conflicting public/manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OG Golf",
    short_name: "OG Golf",
    description: "OG Golf — Track. Improve. Own the Course. Fast, private golf score tracking.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f3d24",
    theme_color: "#c5a36f",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
