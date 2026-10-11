/** @type {import('next').NextConfig} */
const nextConfig = {
  // Foods and Gym were folded into the single Log page; keep old bookmarks working.
  async redirects() {
    return [
      { source: "/foods", destination: "/", permanent: false },
      { source: "/gym", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
