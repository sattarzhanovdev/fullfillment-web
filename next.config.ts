import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Компактный автономный билд для Docker (VPS-деплой) — не нужен на Netlify,
  // там используется собственный адаптер и это поле игнорируется.
  output: "standalone",
};

export default nextConfig;
