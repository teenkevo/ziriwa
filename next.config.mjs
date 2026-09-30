/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/departments',
        permanent: true,
      },
    ]
  },
}


export default nextConfig
