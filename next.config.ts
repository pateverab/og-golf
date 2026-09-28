import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  // Avoid wiping in-progress localStorage scoring UI when reconnecting.
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/offline", revision },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Verification builds go to a separate folder (e.g. NEXT_DIST_DIR=.next-verify npm run build)
  // so they never overwrite the .next folder a running `next dev` is using.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default withSerwist(nextConfig);
