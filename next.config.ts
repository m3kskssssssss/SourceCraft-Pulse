import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // argon2 — нативный модуль: собранный .node лежит в prebuilds и подключается
  // через node-gyp-build уже в рантайме. Бандлеру его отдавать нельзя, иначе
  // на Vercel отвалится вход в админку и регистрация.
  serverExternalPackages: ["argon2"],
  // Шрифт для выгрузки картинкой и PDF читается с диска — его нужно взять в
  // функцию явно, трассировка импортов про него не знает.
  outputFileTracingIncludes: {
    "/a/[id]/export/[file]": ["./src/lib/poster/fonts/**"],
  },
};

export default nextConfig;
