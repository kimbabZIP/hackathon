import { defineConfig, loadEnv } from "vite";

const API_SERVER_ORIGIN = "http://3.122.56.68:8010";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiTarget =
    process.env.SCHOLARLY_API_TARGET?.trim() ||
    env.SCHOLARLY_API_TARGET?.trim() ||
    API_SERVER_ORIGIN;

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
