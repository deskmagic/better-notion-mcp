# CLAUDE.md - better-notion-mcp (DeskMagic fork)

Fork of [n24q02m/better-notion-mcp](https://github.com/n24q02m/better-notion-mcp). Upstream is `upstream`, our fork is `origin` (`reasn/better-notion-mcp`).

## Issue Tracking

**All work is tracked in GitHub Issues on this repository** - not Linear, not any other system. Every change (except typo fixes) must have a corresponding GitHub issue.

- Before starting work, check for an existing issue or create one
- Issues should have a clear title and acceptance criteria
- Use GitHub labels: `bug`, `enhancement`, `refactor`, `test`, `docs`

## Branching Model

Branch from `main`. Branch names must follow this pattern:

```
<type>/<issue-number>-<short-description>
```

| Type | When |
|------|------|
| `fix/` | Bug fixes |
| `feat/` | New features or enhancements |
| `refactor/` | Code restructuring without behavior change |
| `test/` | Adding or improving tests |
| `docs/` | Documentation changes |
| `chore/` | Dependencies, CI, tooling |

Examples:
- `fix/42-handle-empty-relation-property`
- `feat/15-add-mention-page-support`
- `refactor/31-extract-pagination-helper`

Rules:
- Always include the issue number
- Use kebab-case for the description
- Keep descriptions short (3-5 words)
- Never push directly to `main`

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by git hooks). Every commit message must reference the issue:

```
<type>(scope): <description> (#<issue-number>)
```

Examples:
- `fix(blocks): handle empty toggle children (#42)`
- `feat(pages): add mention-page markdown syntax (#15)`
- `test(markdown): add column block round-trip tests (#31)`
- `refactor(pagination): extract cursor helper (#31)`

### Atomic Commits

Each commit must be a single logical change that builds and passes tests on its own:

- **One concern per commit.** Don't mix a bug fix with a refactor. Don't combine test additions with feature code.
- **Each commit must pass** `bun run check` and `bun run test`. If pre-commit hooks run, they must succeed.
- **Order matters.** Structure commits so reviewing them in sequence tells a story: first the test that exposes the bug, then the fix.
- **When to split:** If your commit message needs "and" (e.g., "fix pagination and add retry logic"), split it into two commits.

## Agent Workflow

### TDD - Test-Driven Development (mandatory)

Every functional change follows strict TDD:

1. **Write the failing test first.** Add a test in the co-located `.test.ts` file that captures the expected behavior. Commit it separately: `test(scope): add failing test for <behavior> (#<issue>)`.
2. **Run `bun run test` to confirm it fails.** If the test passes before you change anything, the test is wrong or the issue is already fixed.
3. **Make the minimal code change** to make the test pass.
4. **Run the full gate:** `bun run check && bun run test`. Both must pass.
5. **Commit the fix** separately: `fix(scope): <description> (#<issue>)`.

This produces at least two commits per fix: the test, then the implementation. Reviewers can verify the test actually catches the bug by checking out the test commit alone.

### Worktree Isolation

Each issue is worked on in its own git worktree. This prevents conflicts when multiple agents work in parallel.

- Use `git worktree add ../better-notion-mcp-<issue> -b <branch-name>` to create a worktree
- Or use Claude Code's built-in worktree support
- Never work on multiple issues in the same worktree
- Clean up worktrees after the PR is merged

### Pull Requests

PRs go to `origin/main` (our fork). Every PR must:

1. Reference the GitHub issue in the PR description (`Closes #<number>`)
2. Have a clear title following Conventional Commits style
3. Pass all checks: `bun run check` and `bun run test`
4. Include tests for new functionality or bug fixes
5. Keep the diff focused - one issue per PR
6. Have at least two commits: the failing test, then the fix

Use the existing PR template in `.github/PULL_REQUEST_TEMPLATE.md`.

### Quality Gate

Before marking any work as done, run:

```bash
bun run check && bun run test
```

Both commands must pass. Do not skip pre-commit hooks (`--no-verify`). If a hook fails, fix the issue.

**CRITICAL:** Always use `bun run test`, never bare `bun test`. The bare `bun test` uses bun's built-in runner which is incompatible with vitest and produces false failures.

## Development Setup

```bash
bun install          # Install dependencies
bun run build        # Build
bun run test         # Run tests (vitest) - NEVER use bare "bun test" (wrong runner)
bun run check        # Lint + type-check (CI gate)
bun run dev          # Dev server with auto-reload
```

**CRITICAL:** Always use `bun run test`, never bare `bun test`. The bare `bun test` invokes bun's built-in test runner which is incompatible with vitest APIs (`vi.hoisted`, `importOriginal`, etc.) and produces hundreds of false failures. `bun run test` correctly delegates to vitest.

## Testing

### Sandbox

All live Notion testing goes to a sandbox page - never to production pages. The sandbox page ID is stored in `.env.test` (gitignored, not committed). If `.env.test` does not exist, ask the user for the sandbox page ID.

### MCP Servers

Two MCP server entries exist in `~/.claude.json`:

| Entry | Points at | Tool prefix | Purpose |
|-------|-----------|-------------|---------|
| `notion` | `npx @n24q02m/better-notion-mcp@latest` | `mcp__notion__*` | Production - use for integration testing |
| `notion-dev` | Local fork at `bin/cli.mjs` | `mcp__notion-dev__*` | Dev testing (requires new session after rebuild) |

### Testing Requirements (mandatory for every PR)

Every PR must include BOTH unit tests AND integration tests against live Notion. No PR may be created without completing both phases.

#### Phase 1: Unit Tests

1. Write failing tests in the co-located `.test.ts` file (TDD)
2. Implement the fix
3. Run `bun run check && bun run test` - all must pass
4. Commit test and fix separately

#### Phase 2: Integration Tests Against Live Notion

After unit tests pass, test against the real Notion API using `mcp__notion__*` (production MCP). This verifies that Notion actually accepts the formats your code produces.

**Step 1: Create a test sub-page**

Create a sub-page under the sandbox page for your test. This isolates your tests from other agents:

```
mcp__notion__pages (action: "create", parent_id: "<sandbox-page-id>", title: "Test: <issue-description> - <timestamp>")
```

**Step 2: Write a test plan**

Before testing, write out your test plan as a comment. Include:
- **Happy path cases** - the basic scenarios your fix addresses
- **Edge cases** - boundary conditions, empty inputs, special characters, large inputs
- **Error cases** - what should fail gracefully, what should be rejected
- **Round-trip verification** - write content, read it back, verify it matches

Example test plan for table rich text:
```
1. Happy path: Table with **bold**, *italic*, `code`, [link](url) in cells
2. Edge case: Table with empty cells
3. Edge case: Table with cells containing only formatting markers (e.g., "****")
4. Edge case: Table with pipe character inside formatted text (e.g., "**a|b**")
5. Round-trip: Write table with formatting, read back, verify rich_text annotations
```

**Step 3: Execute tests**

For each test case:
1. Use `mcp__notion__blocks` (action: `append`) to write test content to your sub-page
2. Use `mcp__notion__blocks` (action: `children`) to read back what Notion stored
3. Inspect the `blocks` array in the response (not just the markdown) - verify the raw API response has the expected structure
4. For layout/visual issues, use Chrome MCP (`mcp__claude-in-chrome__read_page`) to visually verify rendering
5. Report results: what passed, what failed, what was unexpected

**Step 4: Clean up**

Delete your test sub-page when done:
```
mcp__notion__pages (action: "archive", page_id: "<test-page-id>")
```

**Step 5: Document results in PR**

Include in the PR description:
- Test plan (from Step 2)
- Results for each test case (pass/fail + evidence)
- Any edge cases discovered during testing
- Screenshots or Chrome MCP output for visual checks (if applicable)

### What Requires Visual Verification

| Feature area | API check sufficient? | Chrome MCP needed? |
|-------------|----------------------|-------------------|
| Rich text formatting | Yes - check `rich_text` annotations | No |
| Page mentions | Yes - check `mention.page` in rich_text | No |
| Relations | Yes - check `relation` property format | No |
| Icons | Yes - check `icon` in page response | No |
| Columns/layouts | Check block structure | Yes - verify visual rendering |
| Tables | Check `table_row` cells | Yes - verify visual rendering |
| Callouts | Check callout icon/color | No |
| Toggles | Check toggle children | No |

## Key Source Files

| File | What it does |
|------|-------------|
| `src/tools/helpers/markdown.ts` | Markdown-to-blocks and blocks-to-markdown conversion |
| `src/tools/composite/blocks.ts` | Blocks tool (append, children, update, delete) |
| `src/tools/composite/pages.ts` | Pages tool (get, create, update, archive) |
| `src/tools/helpers/richtext.ts` | Rich text parsing and generation |
| `src/tools/helpers/properties.ts` | Page property extraction |
| `src/tools/registry.ts` | Tool registration and routing |

## Upstream Sync

Keep the fork in sync:

```bash
git fetch upstream
git rebase upstream/main  # when on main
```

Before starting new work, always sync with upstream first.

## What NOT to Do

- Do not track work in Linear - use GitHub Issues on this repo
- Do not push directly to `main`
- Do not create commits that bundle unrelated changes
- Do not submit PRs without tests for functional changes
- Do not test against production Notion pages - use the sandbox
