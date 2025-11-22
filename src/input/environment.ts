export function buildEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return {
    ...env,
    FORCE_COLOR: env["FORCE_COLOR"] ?? "1",
  };
}

export const environment = buildEnvironment();
