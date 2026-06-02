/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sofifa.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
