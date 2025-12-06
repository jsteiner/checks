# Tools

You have access to the following `pnpm` scripts:

```json
  {
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint:biome": "biome check --write",
    "test": "tsx --test src/**/*.{test.ts,test.tsx}",
    "checks": "build && start"
  }
```

# Workflow

- When you are done implementing changes, you MUST run `pnpm checks` and fix any errors until all checks pass.
- Do NOT loosen restrictions in any checks (e.g. lower coverage thresholds or disable rules in config) to get checks passing.

# Architecture

- Always read `docs/ARCHITECTURE.md` when you first start up.
- Update `docs/ARCHITECTURE.md` when making meaningful architectural changes.

# tmux-cli Command to interact with CLI applications

`tmux-cli` is a bash command that enables coding agents to control CLI applications
running in separate tmux panes - launch programs, send input, capture output,
and manage interactive sessions. Run `tmux-cli --help` for detailed usage
instructions.

Use it to test `checks` in interactive/watch mode.
