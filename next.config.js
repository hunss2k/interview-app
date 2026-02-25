/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['telegraf'],
  },
};

module.exports = nextConfig;
