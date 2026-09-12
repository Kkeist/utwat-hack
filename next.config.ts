import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Don't let Next.js write its own AGENTS.md/CLAUDE.md into the repo root. */
  agentRules: false,
  /* The dev-mode corner badge (route info / build indicator). Dev-only either way, but off. */
  devIndicators: false,
};

export default nextConfig;
