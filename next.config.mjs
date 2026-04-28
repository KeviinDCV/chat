/** @type {import('next').NextConfig} */
const buildId =
  (process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)) ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `local-${Date.now()}`;

const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => buildId,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
};

export default nextConfig;
