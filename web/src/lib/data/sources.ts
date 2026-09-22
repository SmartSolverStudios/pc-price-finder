import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BuildResults } from "@/lib/types";
import { normalizeResults } from "./normalize";
import { rawConfigSchema, rawResultsSchema, type RawConfig } from "./schema";

/** Anything that can produce a normalized build result: local JSON now, Supabase/API later. */
export interface BuildDataSource {
  readonly id: string;
  load(): Promise<BuildResults>;
}

export class DataLoadError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "DataLoadError";
  }
}

const DATA_DIR = process.env.PC_FINDER_DATA_DIR ?? path.join(process.cwd(), "data");

async function readJson(file: string): Promise<unknown> {
  const text = await readFile(file, "utf-8");
  return JSON.parse(text);
}

/** Reads results.json (required) and build_config.json (optional) produced by the Python v5 scraper. */
export class LocalJsonSource implements BuildDataSource {
  readonly id = "local-json";

  constructor(private readonly dir: string = DATA_DIR) {}

  async load(): Promise<BuildResults> {
    const resultsPath = path.join(this.dir, "results.json");
    let rawJson: unknown;
    try {
      rawJson = await readJson(resultsPath);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      throw new DataLoadError(
        code === "ENOENT" ? "results.json was not found." : "results.json could not be parsed.",
        code === "ENOENT" ? `Expected at ${resultsPath}. Run the scraper, then \`npm run sync-data\`.` : String(e),
      );
    }

    const parsed = rawResultsSchema.safeParse(rawJson);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      throw new DataLoadError("results.json does not match the expected v5 structure.", issues);
    }

    return normalizeResults(parsed.data, await this.loadConfig());
  }

  private async loadConfig(): Promise<RawConfig | null> {
    try {
      const parsed = rawConfigSchema.safeParse(await readJson(path.join(this.dir, "build_config.json")));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}

export function getDataSource(): BuildDataSource {
  return new LocalJsonSource();
}
