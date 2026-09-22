// Copies the latest scraper output into ./data so the app can be built and deployed on its own.
// Source directory: PC_FINDER_SCRAPER_DIR, defaulting to the sibling v5 scraper folder.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.resolve(root, process.env.PC_FINDER_SCRAPER_DIR ?? "../pc-price-finder-v5");
const targetDir = path.join(root, "data");
const files = ["results.json", "build_config.json"];

if (!existsSync(sourceDir)) {
  console.log(`[sync-data] Scraper folder not found (${sourceDir}); using the existing ./data files.`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
for (const file of files) {
  const from = path.join(sourceDir, file);
  if (!existsSync(from)) {
    console.log(`[sync-data] ${file} not found in ${sourceDir}; skipped.`);
    continue;
  }
  copyFileSync(from, path.join(targetDir, file));
  console.log(`[sync-data] ${file} copied (${statSync(from).mtime.toISOString()})`);
}
