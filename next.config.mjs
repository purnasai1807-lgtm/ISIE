/** @type {import('next').NextConfig} */
const isBuild =
  process.argv.includes("build") ||
  process.env.npm_lifecycle_event === "build" ||
  process.env.NODE_ENV === "production";

const nextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
  ...(isBuild ? { output: "standalone" } : {}),
  reactStrictMode: false,
  transpilePackages: ["three"],
};

export default nextConfig;
