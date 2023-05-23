// eslint-disable-next-line @typescript-eslint/no-var-requires
const { i18n } = require("./next-i18next.config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  i18n,
  compiler: {
    styledComponents: true,
  },
  eslint: {
    dirs: ["src", "e2e"], // Only run ESLint on the 'src' and 'e2e' directories during production builds (next build)
  },
};

module.exports = nextConfig;
