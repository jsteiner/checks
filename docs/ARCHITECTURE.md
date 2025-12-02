# Architecture

This document describes the architecture of the Checks CLI tool.

## Overview

Checks is a CLI tool for running tests and static analysis in parallel with human-friendly, token-efficient output. It's built with TypeScript, uses React (via Ink) for the terminal UI, and supports monorepo workflows.

### Key Features

- Parallel execution of checks across one or more projects
- Interactive TUI with keyboard controls
- Smart output management (only failed checks show output by default)
- Configurable filtering, concurrency, and fail-fast modes
- Terminal buffer management with ANSI code processing

## Architecture Layers

The codebase follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────┐
│      Entry Point (index.tsx)        │  CLI orchestration & exit codes
├─────────────────────────────────────┤
│      UI Layer (src/ui/)             │  React components via Ink
├─────────────────────────────────────┤
│    State Layer (src/state/)         │  Event-driven state management
├─────────────────────────────────────┤
│   Executor Layer (src/executor/)    │  Process execution & PTY
├─────────────────────────────────────┤
│    Input Layer (src/input/)         │  Configuration & CLI parsing
└─────────────────────────────────────┘
```

### 1. Entry Point Layer

**Location:** `src/index.tsx`

The main entry point orchestrates the application flow:

- `runChecks()`: Main orchestration function with dependency injection
- `main()`: CLI entry point when executed directly
- Exit codes:
  - `0`: All checks passed
  - `1`: Orchestrator error
  - `2`: One or more checks failed
  - `3`: Aborted by user

**Workflow:**
1. Parse CLI arguments → build input configuration
2. Create Suite store from project definitions
3. Initialize Executor with terminal dimensions
4. Render App UI (React/Ink)
5. Run executor and wait for completion
6. Return appropriate exit code

### 2. Input Layer

**Location:** `src/input/`

Handles configuration loading and CLI argument parsing:

- `cli.ts`: CLI argument parsing using Commander
- `fileConfig.ts`: JSON config file loading/validation using Zod
- `discoverConfigPaths.ts`: Recursive config file discovery for monorepos
- `checkFilters.ts`: Pattern-based filtering (`--only`/`--exclude`)
- `projectColors.ts`: Terminal color assignment

**Features:**
- Single project mode and recursive (monorepo) mode
- Auto-discovery of `checks.config.json` files
- Pattern-based filtering with glob support (e.g., `web/**`, `lint*`)
- Default concurrency: 75% of available CPUs

**Config File Format:**
```json
{
  "project": "project-name",
  "color": "cyan",
  "checks": [
    { "name": "test", "command": "pnpm test" }
  ]
}
```

### 3. State Layer

**Location:** `src/state/`

Event-driven state architecture using EventEmitter:

- `Suite.ts`: Top-level state container for all projects
- `Project.ts`: Project-level state with checks collection
- `Check.ts`: Individual check state and lifecycle
- `summary.ts`: Summary calculation utilities
- `eventEmitterHelper.ts`: Async completion helpers

**State Hierarchy:**

```
Suite
├─ projects: Project[]
├─ summary: Summary
└─ isComplete: boolean

Project
├─ project: string
├─ path: string
├─ color: ProjectColor
├─ checks: Check[]
├─ summary: Summary
└─ isComplete: boolean

Check
├─ name: string
├─ command: string
├─ index: number
├─ output: string
└─ result: CheckResult
    ├─ { status: "pending" }
    ├─ { status: "running" }
    ├─ { status: "passed", finishedAt, exitCode }
    ├─ { status: "failed", finishedAt, exitCode, errorMessage }
    └─ { status: "aborted", finishedAt }

Summary
├─ total, pending, passed, failed, aborted: number
└─ durationMs: number
```

**Event Flow:**

```
Check update
    │
    ├─ Check.setOutput() / markRunning() / markPassed() / etc.
    │
    ├─ Calls onUpdate("status" | "output")
    │
    ▼
Project.handleCheckUpdate()
    │
    ├─ Emits { eventType, checkIndex }
    │
    ▼
Suite.emit()
    │
    ├─ Creates new immutable snapshot via createState()
    │
    ├─ Emits "update" event to all subscribers
    │
    ▼
UI components (via useSyncExternalStore)
    │
    └─ Re-render only if relevant (status change or focused check output)
```

**Check Lifecycle:**
- States: `pending` → `running` → `passed`/`failed`/`aborted`
- Each state transition emits events
- Events bubble up: Check → Project → Suite
- Events carry metadata: `{ eventType: "status" | "output", checkIndex: number }`

**Key Patterns:**
- **Immutable snapshots:** `toState()` methods create immutable state snapshots
- **Event-driven updates:** Subscribe to changes rather than polling
- **Completion tracking:** `waitForCompletion()` returns a promise

### 4. Executor Layer

**Location:** `src/executor/`

Manages parallel execution of checks:

- `index.ts`: Main executor with concurrency control
- `CheckExecutor.ts`: Single check execution logic
- `PtyProcess.ts`: PTY (pseudo-terminal) process spawning
- `OutputManager.ts`: Terminal buffer lifecycle management
- `TerminalBuffer.ts`: ANSI code processing using xterm.js
- `terminalConfig.ts`: Terminal dimension calculations

**Execution Flow:**
1. `Executor.run()` uses `p-limit` for concurrency control
2. Creates `CheckExecutor` for each check
3. Spawns PTY process with proper terminal dimensions
4. Streams output through `OutputManager` → `TerminalBuffer`
5. Updates Check state on completion

**Features:**
- **PTY spawning:** Full terminal emulation for colored output
- **Terminal buffer:** Uses `@xterm/headless` to process ANSI codes
- **Output deduplication:** Only updates when output changes
- **Abort handling:** Propagates abort signals to child processes
- **Fail-fast mode:** Aborts remaining checks after first failure
- **Dynamic resize:** Handles terminal resize events

### 5. UI Layer

**Location:** `src/ui/`

React-based terminal UI using Ink:

**Component Hierarchy:**
```
App
├── LayoutProvider (context for column widths)
├── Suite (default view)
│   ├── Project (per project)
│   │   └── Check (per check)
│   │       ├── CheckHeader
│   │       └── CheckOutput
│   ├── Divider
│   └── Summary
└── Legend (interactive mode only)
```

**Key Files:**
- `App.tsx`: Root component with state subscription
- `Suite/`, `Check/`, `Project/`: View components
- `Legend.tsx`: Keyboard shortcuts display
- `LayoutContext.tsx`: Responsive layout calculations
- `hooks/`: Custom React hooks
  - `useFocus.ts`: Focus state management
  - `useHotkeys.ts`: Keyboard input handling
  - `useAbortExit.ts`: Auto-exit logic

**State Subscription:**
Uses `useSyncExternalStore` with smart filtering:
- Always re-renders on status changes
- Only re-renders on output changes for focused check
- Avoids unnecessary renders for unfocused checks

**Interactive Features:**
- Number keys (1-9): Focus specific check to view live output
- `x` or repeat number: Unfocus current check
- `q`: Quit (aborts if checks still running)
- Auto-exit in non-interactive mode when complete

## Type System

**Location:** `src/types.ts`

Strong TypeScript typing throughout:

- `CheckDefinition`: Configuration for a check
- `CheckState`: Runtime state including output and result
- `CheckResult`: Discriminated union of check states
- `ProjectDefinition`/`ProjectState`: Project-level types
- `SuiteDefinition`/`SuiteState`: Suite-level types
- `Summary`: Aggregated statistics
- `TerminalDimensions`: Terminal size information

Uses discriminated unions and strict TypeScript for type safety.

## Testing Infrastructure

**Test Setup:**
- Framework: Node.js native test runner (via `tsx`)
- Coverage: 95% threshold for lines, branches, and functions
- Test helpers: `src/test/helpers/`
- Co-located tests: `.test.ts` suffix alongside source files

**Test Helpers:**
- `factories.ts`: Factory functions for test data
- `fakeSpawnedProcess.ts`: Mock process implementation
- `ptyProcess.ts`: PTY test utilities
- `terminal.ts`: Terminal dimension helpers
- `ui.tsx`: UI testing utilities (Ink testing library)
- `app.tsx`: App-level test helpers
- `configFile.ts`: Config file test utilities

**Testing Approach:**
- Unit tests co-located with source files
- Integration test: `src/integration.test.tsx`
- Dependency injection enables easy mocking

## Key Architectural Patterns

### 1. Event-Driven Architecture
State changes propagate through EventEmitter subscriptions, enabling reactive updates without polling.

### 2. Factory Pattern
Extensive use of factory functions in tests for creating consistent test data.

### 3. Dependency Injection
Main orchestration function accepts dependencies, enabling testability without complex mocking frameworks.

### 4. Immutable Snapshots
State stores maintain internal mutable state but expose immutable snapshots via `toState()`.

### 5. Terminal Emulation
Uses PTY and headless xterm.js to properly handle ANSI codes, ensuring accurate output capture.

### 6. Smart Rendering Optimization
UI only re-renders when necessary, using `useSyncExternalStore` with custom subscription logic.

### 7. Abort Signal Propagation
Uses AbortController/AbortSignal for cancellation, properly forwarding signals through the execution tree.

### 8. Separation of Concerns
Clear boundaries between layers:
- **Input:** Configuration & CLI
- **State:** Business logic & data
- **Executor:** Process management
- **UI:** Presentation

## Key Dependencies

**Runtime:**
- `ink`: React for terminal UIs
- `commander`: CLI argument parsing
- `node-pty`: PTY (pseudo-terminal) for subprocess execution
- `@xterm/headless`: Terminal emulation for ANSI code handling
- `zod`: Runtime schema validation
- `p-limit`: Concurrency control

**Development:**
- `typescript`: Type checking and compilation
- `@biomejs/biome`: Linting and formatting
- `knip`: Unused code detection
- `jscpd`: Code duplication detection
- `tsx`: TypeScript execution for tests
- `ink-testing-library`: Testing Ink components

## Build and Distribution

**Build Process:**
1. `pnpm build`: Compiles TypeScript to `dist/`
2. `pnpm prepare`: Runs build on install (for git installs)
3. Binary: `dist/index.js` (executable via `checks` command)

**Distribution:**
- Package includes: `dist/`, `checks.config.schema.json`
- Binary name: `checks`
- Type: ESM module

## Configuration Files

- `tsconfig.json`: TypeScript configuration (ES2022, strict mode)
- `biome.json`: Linter and formatter configuration
- `knip.json`: Unused code detection configuration
- `jscpd.json`: Code duplication detection configuration
- `checks.config.json`: Project's own checks configuration

## Self-Hosting

The project uses itself for checks:

```json
{
  "project": "checks",
  "checks": [
    { "name": "typecheck", "command": "pnpm typecheck" },
    { "name": "test", "command": "pnpm test" },
    { "name": "lint:biome", "command": "pnpm lint:biome" },
    { "name": "lint:unused", "command": "pnpm lint:unused" },
    { "name": "lint:dupes", "command": "pnpm lint:dupes" }
  ]
}
```

When making changes, run `pnpm checks` to ensure all checks pass.
