/** In development, /api calls go to the local FastAPI server. On Vercel, vercel.json routes them to api/index.py. */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }];
  },
};

export default nextConfig;
