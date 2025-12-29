import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "img-001": resolve(__dirname, "src/tools/image/IMG-001/index.html"),
        "aud-001": resolve(__dirname, "src/tools/audio/AUD-001/index.html"),
        "cal-001": resolve(__dirname, "src/tools/calculation/CAL-001/index.html"),
        "cal-002": resolve(__dirname, "src/tools/calculation/CAL-002/index.html"),
        "cal-003": resolve(__dirname, "src/tools/calculation/CAL-003/index.html"),
        "cal-004": resolve(__dirname, "src/tools/calculation/CAL-004/index.html"),
        "cal-005": resolve(__dirname, "src/tools/calculation/CAL-005/index.html"),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
