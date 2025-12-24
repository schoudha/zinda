import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Only apply Serwist in production (or non-development) environments.
// Serwist injects a webpack config which causes Turbopack (default in dev) to throw an error.
// By skipping it in dev, we keep Turbopack fast for general development.
let configExport = nextConfig;

if (process.env.NODE_ENV !== "development") {
  const withSerwist = withSerwistInit({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
  });
  configExport = withSerwist(nextConfig);
}

export default configExport;
