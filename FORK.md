# Fork Workflow

This is a fork of [n24q02m/better-notion-mcp](https://github.com/n24q02m/better-notion-mcp)
maintained at [deskmagic/better-notion-mcp](https://github.com/deskmagic/better-notion-mcp).

## Remotes

| Remote | URL | Purpose |
|--------|-----|---------|
| `origin` | `git@github.com:deskmagic/better-notion-mcp.git` | The fork — our deploy target |
| `upstream` | `git@github.com:n24q02m/better-notion-mcp.git` | Original repo |

---

## Upstream direction (HARD RULE)

The relationship to upstream is **one-way: pull-only, never push**.

| Direction | Allowed? | Notes |
|-----------|----------|-------|
| `upstream → origin` (fetch + merge) | **Mandatory** before any other work | Step 1 of the workflow below. Keeps us current and avoids double work. |
| `origin → upstream` (push) | **Strictly forbidden** | No `git push upstream …`, ever. |
| `origin → upstream` (PR) | **Strictly forbidden** | No `gh pr create --repo n24q02m/…`, ever. No exceptions, no "deliberate decisions," no agent autonomy here. |

If you believe an upstream PR is warranted, **stop and surface that thought to Alexander as a conversation**. Do not open it, do not draft it, do not push the branch to a name that hints at one. The fork is the deploy target; upstream is not our concern.

Rationale: upstream PRs are public, reputationally weighted, and create coordination overhead we don't want. The fork exists precisely so we can move quickly without negotiating with upstream maintainers. Treat upstream as a read-only dependency.

---

## Mandatory Workflow (in order, no skipping steps)

### Step 1 — Sync upstream FIRST, before any other work

```bash
git fetch upstream
git merge upstream/main
# Resolve any conflicts, then:
bun run preflight   # check + test + build must all pass
git push origin main
```

This must happen before writing any code. It ensures:
- Our work applies cleanly to the current upstream state
- We don't accidentally re-do something upstream already fixed
- Fork PRs against `main` are conflict-free from the start

### Step 2 — Write the failing test

Before touching production code, write a test that fails because of the bug or
that describes the missing behavior. Commit it separately with a `test:` prefix.

```bash
bun run test   # must show the new test failing
```

### Step 3 — Fix the code

Make the minimal change needed to make the failing test pass. Run the full preflight gate.

```bash
bun run preflight   # biome check + type-check + all tests + build — must all pass
```

**Never commit if preflight fails.** Biome formatting errors will fail CI even if tests pass.

### Step 4 — Push to the fork and open a PR to fork/main

```bash
git push origin fix/my-fix
gh pr create --repo deskmagic/better-notion-mcp --base main --head fix/my-fix
```

This is our internal deploy path. No special restrictions.

There is no Step 5. The workflow ends here — see the "Upstream direction" section above for why opening an upstream PR is not an option.

---

## Pulling upstream changes (routine sync)

```bash
git fetch upstream
git checkout main
git merge upstream/main
# Resolve conflicts if any
bun run preflight   # must pass before push
git push origin main
```

Do this regularly to keep the fork current and avoid large conflict batches.
