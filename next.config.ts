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
  // The onnxruntime binding loads libonnxruntime.so at runtime, which file
  // tracing can't see. Without it, every route that imports the embedding
  // model crashes on Vercel. (The CUDA/TensorRT providers are left out.)
  outputFileTracingIncludes: {
    "/**": ["./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1"],
  },
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
