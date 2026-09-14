import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The sidebar and tool cards pull individual icons out of a package that
    // exports well over a thousand. Rewriting those to direct imports keeps the
    // rest out of the bundle.
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
};

export default nextConfig;
