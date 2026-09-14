import type { NextConfig } from "next";

/**
 * Portfolio deploy: no API routes, no backend, so `next build` emits a plain
 * static site (`out/`) that Cloudflare Pages can serve directly.
 */
const nextConfig: NextConfig = {
  output: 'export',
  /* Don't let Next.js write its own AGENTS.md/CLAUDE.md into the repo root. */
  agentRules: false,
  /* The dev-mode corner badge (route info / build indicator). Dev-only either way, but off. */
  devIndicators: false,
};

export default nextConfig;
