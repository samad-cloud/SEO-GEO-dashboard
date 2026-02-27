import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/seo/audits/[auditId]/tickets": [
      "./src/lib/agents/ticket-creation/specs/**/*.yaml",
    ],
  },
};

export default nextConfig;
