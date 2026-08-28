import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiTarget =
    process.env.SCHOLARLY_API_TARGET ||
    env.SCHOLARLY_API_TARGET ||
    "http://127.0.0.1:8010";

  return {
    server: {
      proxy: {
        "/scholarly-api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/scholarly-api/, "/api"),
        },
      },
    },
  };
});
