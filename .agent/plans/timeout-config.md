# ExecPlan: Check timeouts

## Goal
Add per-check timeout configuration with clear defaults, validation, and execution behavior.

## Requirements
- Support `checks[].timeout` with `{ ms, signal, killAfterMs, onTimeout }`.
- Validate config input and update JSON schema.
- Enforce timeouts during execution with clean process teardown.
- Update docs and tests; keep behavior consistent with current CLI.

## Design
- Config schema: `timeout.ms` required; `signal`, `killAfterMs`, `onTimeout` optional.
- Defaults: `signal = SIGTERM`, `onTimeout = failed`, `killAfterMs = undefined` (no SIGKILL unless set).
- Executor: start timeout after spawn; on timeout, emit a timeout message, mark result based on `onTimeout`, send `signal`, and optionally SIGKILL after `killAfterMs`.
- Guard against double-resolution and terminal state overrides.

## Steps
1. Update types + config parsing + schema; add config validation tests.
2. Implement executor timeout handling; add executor tests for `signal`, `onTimeout`, and `killAfterMs`.
3. Update README + ARCHITECTURE docs with timeout usage.
4. Run `pnpm checks`.

## Risks
- Races between timeout and process close; ensure terminal state is respected.
- Flaky timers in tests; use short, deterministic durations.

## Validation
- `pnpm checks`
