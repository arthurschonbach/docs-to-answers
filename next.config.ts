import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // pdf.js needs real Node module resolution (worker file) - don't bundle it.
  // better-sqlite3 and the transformers/onnxruntime native bindings stay
  // out of the bundle too (required on Vercel serverless).
  serverExternalPackages: [
    "pdfjs-dist",
    "better-sqlite3",
    "@huggingface/transformers",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
