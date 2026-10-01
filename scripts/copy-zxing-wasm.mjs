// Copies the zxing barcode reader WASM into public/ so the scanner is served
// from our own origin (works offline, no third-party CDN). Runs on postinstall.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const source = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
const targetDir = join(process.cwd(), "public", "zxing");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, "zxing_reader.wasm"));
console.log("Copied zxing_reader.wasm to public/zxing/");
