import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@bullhaus/core", "@bullhaus/db"],
  serverExternalPackages: ["sharp", "exceljs", "@prisma/client"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default config;
