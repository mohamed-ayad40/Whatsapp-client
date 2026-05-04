/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_ZEGO_APP_ID: process.env.NEXT_PUBLIC_ZEGO_APP_ID,
    NEXT_PUBLIC_ZEGO_SERVER_ID: process.env.NEXT_PUBLIC_ZEGO_SERVER_ID
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "http",
        hostname: "localhost", // ضفنا دي عشان الصور القديمة متعملش إيرور
      },
    ],
  },
};

module.exports = nextConfig;