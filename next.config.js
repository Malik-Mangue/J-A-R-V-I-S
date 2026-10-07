/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The embedded PostgreSQL engine (PGlite, WASM) must not be bundled by the
  // Next.js server compiler; it is loaded at runtime by the database client.
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
};

export default nextConfig;
