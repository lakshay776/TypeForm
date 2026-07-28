import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev overlay badge sits bottom-left, exactly on top of the "Ask Typeform AI"
  // composer, so it hides a real part of the UI while developing.
  devIndicators: false,

  turbopack: {
    // Pinned explicitly: an unrelated package-lock.json further up the filesystem
    // makes Turbopack infer the wrong workspace root, which breaks module
    // resolution for the `@/*` alias.
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
