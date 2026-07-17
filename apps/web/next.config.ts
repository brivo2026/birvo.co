import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@birvo/ui', '@birvo/contracts'],
  reactStrictMode: true,
  turbopack: {
    // Los paquetes del monorepo (packages/ui, packages/contracts) están
    // enlazados vía pnpm workspaces fuera de apps/web. Sin fijar la raíz
    // explícitamente, Turbopack a veces no logra resolverlos (falla con
    // "Module not found") en entornos de build limpios como Render, aunque
    // funcione en local — ver https://nextjs.org/docs/app/api-reference/turbopack#filesystem-root.
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
