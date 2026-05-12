import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  outDir: "dist",
  dts: false,
  splitting: false,
  bundle: false,
  minifyWhitespace: true,
  minifySyntax: true,
  onSuccess:
    "cp config.json dist/config.json && cp package.json dist/package.json && cp .env dist/.env",
});
