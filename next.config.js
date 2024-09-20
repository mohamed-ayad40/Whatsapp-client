/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_ZEGO_APP_ID: Number.parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID),
    NEXT_PUBLIC_ZEGO_SERVER_ID: process.env.NEXT_PUBLIC_ZEGO_SERVER_ID
  },
  images: {
    domains: ["localhost"]
  },
};

module.exports = nextConfig;
