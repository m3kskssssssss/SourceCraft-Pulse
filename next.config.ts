import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // argon2 — нативный модуль: собранный .node лежит в prebuilds и подключается
  // через node-gyp-build уже в рантайме. Бандлеру его отдавать нельзя, иначе
  // на Vercel отвалится вход в админку и регистрация.
  serverExternalPackages: ["argon2"],
};

export default nextConfig;
