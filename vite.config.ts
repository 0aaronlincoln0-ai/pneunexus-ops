import netlify from "@netlify/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const enableNetlifyEmulation =
    command === "build" || process.env.ENABLE_NETLIFY_DEV === "true";

  return {
    plugins: [react(), ...(enableNetlifyEmulation ? [netlify()] : [])],
    server: { host: "127.0.0.1", port: Number(process.env.PORT ?? 5173), strictPort: true },
  };
});
