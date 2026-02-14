import { defineConfig } from "vitest/config";
import { readFileSync } from "fs";

export default defineConfig({
  plugins: [
    {
      name: "html-text",
      enforce: "pre",
      load(id) {
        if (id.endsWith(".html")) {
          const content = readFileSync(id, "utf-8");
          return `export default ${JSON.stringify(content)};`;
        }
      },
    },
  ],
  test: {
    globals: true,
  },
});
