# PR Skill

The `/pr` skill automates the full lifecycle from feature branch to published
release. It lives at `.claude/skills/pr/` and is manually invoked.

## Six-phase pipeline

| Phase | Type | Script |
|-------|------|--------|
| 1. Clean and Sync Branches | Script + AI (kbase) | `sync-branches.js` |
| 2. Sync CHANGELOG | AI reasoning | none |
| 3. Update README Docs | Script + AI (sub-agents) | `find-readmes.js` |
| 4. Manage PR | Script | `manage-pr.js` |
| 5. Auto-Merge | Script | `auto-merge.js` |
| 6. Auto-Publish | Script | `auto-publish.js` |

Phases 5-6 are optionally skipped via the `skip=` argument.

## Script / AI separation

Scripts (`.claude/skills/pr/scripts/*.js`) handle mechanical operations: git
commands, `gh` CLI calls, file discovery, polling. They cannot invoke Claude
skills or deploy sub-agents. The SKILL.md orchestrator handles AI-dependent
steps (kbase invocation, CHANGELOG drafting, README content generation)
separately from script execution.

This split exists because a `bun`-executed script has no access to Claude's
tool system. Attempting to put AI steps inside scripts would fail silently or
require an entirely different execution model.

## Arguments

The Claude Code skill argument system is purely positional string substitution.
There are no types, defaults, or named parameters built in. To get "named"
parameter behavior, the skill instructions tell Claude to parse `$ARGUMENTS`
for a `key=value` pattern and validate it.

```
/pr <major|minor|patch> [skip=<auto-merge|auto-publish>]
```

- `$bump` is positional and required. Validated against `major|minor|patch`.
- `skip=` is parsed from `$ARGUMENTS` as a convention, not a system feature.
  Claude's reasoning handles the parsing and validation.

## PR description structure

The PR body is assembled from two sections by `manage-pr.js`:

- **Changelog** (`## Changelog`): extracted from the `## Unreleased` section of
  `CHANGELOG.md` via `changelog.js extract`. Covers package functionality changes.
- **Structural** (`## Structural`): drafted by Claude and passed as an argument to
  the script. Covers non-functionality changes (tooling, CI, documentation, skill
  development, config).

Either section may be empty. The script includes only sections that have content.
The skill fails only when both are empty.

## Confirmation points

The skill pauses for user review via `AskUserQuestion` at four points:

1. After drafting CHANGELOG entries (phase 2)
2. After updating READMEs (phase 3)
3. After drafting the structural PR summary (phase 4)
4. Before auto-merge (phase 4, unless `skip=auto-merge`)

Each prompt offers **Proceed** (commit + continue) or **Stop** (halt).

## Error handling

All scripts exit non-zero on failure with a descriptive message. The SKILL.md
instructs Claude to report the error and stop immediately without attempting
fixes. This is deliberate: the skill observes and reports, it does not
auto-remediate.

## Polling

Phases 5-6 poll GitHub API status every 10 seconds. At 6 requests/minute,
this consumes roughly 2.4% of GitHub's 5,000 requests/hour authenticated rate
limit, even for long-running builds.

## Reuse

Phase 4 reuses the existing `.github/scripts/changelog.js extract` command to
pull the `[Unreleased]` section rather than reimplementing extraction logic.

## See also

- [Publishing and Releases](./publishing.md): the publish workflow that
  phase 6 triggers.
- [Layout](../architecture/layout.md): the workspace structure the README
  discovery script navigates.
