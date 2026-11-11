import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Raíz del monorepo: Vercel necesita trazar archivos fuera de apps/backoffice (paquetes y motor de Prisma).
const monorepoRoot = fileURLToPath(new URL("../..", import.meta.url));

const config: NextConfig = {
  transpilePackages: ["@bullhaus/core", "@bullhaus/db"],
  serverExternalPackages: ["sharp", "exceljs", "@prisma/client"],
  outputFileTracingRoot: monorepoRoot,
  // Con pnpm el cliente generado de Prisma queda en una ruta que el trazado no siempre sigue.
  outputFileTracingIncludes: {
    "/**": ["../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**/*"],
  },
  // Vercel corta las peticiones sobre 4,5 MB; usamos el mismo límite en local para no tener sorpresas.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default config;
