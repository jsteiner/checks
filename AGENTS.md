# Tools

You have access to the following `pnpm` scripts:

```json
  {
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint:biome": "biome check --write",
    "test": "tsx --test src/**/*.{test.ts,test.tsx}",
    "precommit": "build && start"
  }
```

# Workflow

- You MUST get all checks in `pnpm precommit` passing before considering yourself finished with your work.
