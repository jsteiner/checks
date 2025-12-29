import fs from "node:fs/promises";
import { z } from "zod";

const TIMEOUT_SIGNALS = [
  "SIGTERM",
  "SIGINT",
  "SIGQUIT",
  "SIGHUP",
  "SIGKILL",
] as const;
const signalSchema = z.enum(TIMEOUT_SIGNALS);

const timeoutSchema = z
  .object({
    ms: z.number().int().min(1),
    signal: signalSchema.optional(),
    killAfterMs: z.number().int().min(0).optional(),
    onTimeout: z.enum(["failed", "aborted"]).optional(),
  })
  .strict();

const checkSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  command: z.string().trim().min(1, "command is required"),
  timeout: timeoutSchema.optional(),
});

const fileConfigSchema = z.object({
  project: z.string().trim().min(1, "project is required"),
  color: z.string().trim().optional(),
  checks: z.array(checkSchema, { message: "checks must be an array" }),
  children: z.array(z.string().trim().min(1)).optional(),
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
    if (issue.code === "invalid_value") {
      return `${issue.path.join(".")}: ${issue.message}`;
    }
  }
  return issue.message;
}
