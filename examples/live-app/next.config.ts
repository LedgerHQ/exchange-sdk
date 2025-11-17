import type { NextConfig } from "next";
const path = require("path");

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  transpilePackages: ["@ledgerhq/exchange-sdk", "@ledgerhq/tracking-sdk"],

  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
