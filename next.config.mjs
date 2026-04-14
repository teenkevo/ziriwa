/** @type {import('next').NextConfig} */
const nextConfig = {
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
