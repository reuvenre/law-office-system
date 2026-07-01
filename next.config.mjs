/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow larger document uploads through server actions (legal PDFs).
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
