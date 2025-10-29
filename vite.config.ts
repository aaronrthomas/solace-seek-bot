import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// try to require lovable-tagger at runtime; allow it to be absent
let componentTagger: any;
try {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require("lovable-tagger");
  componentTagger = pkg && pkg.componentTagger;
} catch {
  componentTagger = undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
