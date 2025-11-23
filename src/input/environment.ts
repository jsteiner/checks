export function buildEnvironment(env: NodeJS.ProcessEnv) {
  return {
    ...env,
    FORCE_COLOR: env["FORCE_COLOR"] ?? "1",
  };
}

export type Environment = ReturnType<typeof buildEnvironment>;
