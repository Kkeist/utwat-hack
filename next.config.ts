import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Don't let Next.js write its own AGENTS.md/CLAUDE.md into the repo root. */
  agentRules: false,
};

export default nextConfig;
