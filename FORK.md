# Fork Workflow

This is a **private fork** of [n24q02m/better-notion-mcp](https://github.com/n24q02m/better-notion-mcp)
maintained at [reasn/better-notion-mcp](https://github.com/reasn/better-notion-mcp).

## Remotes

| Remote | URL | Purpose |
|--------|-----|---------|
| `origin` | `git@github.com:reasn/better-notion-mcp.git` | The fork - our deploy target |
| `upstream` | `git@github.com:n24q02m/better-notion-mcp.git` | Original repo |

## Day-to-day workflow

All commits and pushes go to `origin` (the fork). This is where our production
version lives and what gets deployed to the local MCP server.

```
git push origin main        # normal deploy
```

## Pulling upstream changes

To pull in upstream improvements:

```
git fetch upstream
git merge upstream/main
```

Resolve any conflicts, then push to origin as usual.

## Opening a PR to upstream

**This must always be a conscious manual decision.** Never do it automatically,
from scripts, or as a side-effect of other work. Upstream PRs are public and
carry reputational weight.

Before opening a PR to upstream:
1. Make sure the change is useful to the broader community (not fork-specific)
2. Make sure it follows the upstream project's style and contribution guidelines
3. Explicitly decide to do it - not as a reflex, not because a tool suggests it

```
# Only when explicitly intended:
gh pr create --repo n24q02m/better-notion-mcp --base main
```

Agents and automated workflows must NEVER run this command or create PRs
to upstream without explicit human instruction.
