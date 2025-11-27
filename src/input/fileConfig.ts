import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const FILE_CONFIG_PATH = path.resolve(
  process.cwd(),
  "checks.config.json",
);

const checkSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  command: z.string().trim().min(1, "command is required"),
});

const fileConfigSchema = z.object({
  project: z.string().trim().min(1, "project is required"),
  color: z.string().trim().optional(),
  checks: z.array(checkSchema, { message: "checks must be an array" }),
});

export class FileConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileConfigError";
  }
}

type FileConfig = z.infer<typeof fileConfigSchema>;

export async function loadFileConfig(configPath: string): Promise<FileConfig> {
  let contents: string;
  try {
    contents = await fs.readFile(configPath, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new FileConfigError(`Config file not found at ${configPath}`);
    }
    throw new FileConfigError(`Failed to read config at ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new FileConfigError(`Invalid JSON in config at ${configPath}`);
  }

  try {
    return fileConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues
        .map((issue) => formatIssue(issue))
        .join("; ");
      throw new FileConfigError(`Invalid config structure: ${details}`);
    }
    throw error;
  }
}

function formatIssue(issue: z.ZodIssue) {
  if (issue.path.length > 0) {
    if (
      issue.code === "invalid_type" &&
      issue.message.toLowerCase().includes("received undefined")
    ) {
      return `${issue.path.join(".")} is required`;
    }
    if (issue.message === "Required") {
      return `${issue.path.join(".")} is required`;
    }
  }
  return issue.message;
}
