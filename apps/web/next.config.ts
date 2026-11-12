import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  transpilePackages: ["@bullhaus/core"],
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
};

export default config;
