# PR Skill

The `/pr` skill automates the full lifecycle from feature branch to published
release. It lives at `.claude/skills/pr/` and is manually invoked.

## Seven-phase pipeline

| Phase | Type | Script |
|-------|------|--------|
| 1. Clean and Sync Branches | Script + AI (kbase) | `sync-branches.js` |
| 2. Lint | Script | `lint.js` |
| 3. Sync CHANGELOG | AI reasoning | none |
| 4. Update README Docs | Script + AI (sub-agents) | `find-readmes.js` |
| 5. Manage PR | Script | `manage-pr.js` |
| 6. Auto-Merge | Script | `auto-merge.js` |
| 7. Auto-Publish | Script | `auto-publish.js` |

Phases 6-7 only run when `version-bump=` is provided. Otherwise the skill
stops after phase 5 (Manage PR).

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
/pr [auto-commit] [version-bump=<patch|minor|major>]
```

- `auto-commit`: if present, the sync script stages, commits, and pushes any
  uncommitted changes before syncing with main. Without it, a dirty working
  tree causes the skill to fail.
- `version-bump=`: if set, phases 6-7 (auto-merge and auto-publish) run. The
  value is passed to the publish workflow. If not set, those phases are skipped.

No parameters are required. `/pr` alone runs phases 1-5.

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

1. After drafting CHANGELOG entries (phase 3)
2. After updating READMEs (phase 4)
3. After drafting the structural PR summary (phase 5)
4. Before auto-merge and auto-publish (phase 5, only when `version-bump=` is set)

Each prompt offers **Proceed** (commit + continue) or **Stop** (halt).

## Error handling

All scripts exit non-zero on failure with a descriptive message. The SKILL.md
instructs Claude to report the error and stop immediately without attempting
fixes. This is deliberate: the skill observes and reports, it does not
auto-remediate.

## Polling

Auto-merge polls PR checks using two queries per cycle: one with `--required`
to fail-fast on required check failures, and one without to wait for all checks
to finish. Auto-publish polls the publish workflow status. Both poll every 10
seconds (roughly 2.4% of GitHub's 5,000 requests/hour authenticated rate limit).

## Post-publish sync

After a successful publish, `auto-publish.js` pulls the latest main (which
includes the version bump commit and CHANGELOG promotion) and merges it back
into the working branch. This prevents merge conflicts on follow-up PRs from
the same branch. The merge is local only (no push), since the remote branch
was deleted by the squash merge.

## Reuse

Phase 5 reuses the existing `.github/scripts/changelog.js extract` command to
pull the `[Unreleased]` section rather than reimplementing extraction logic.

## See also

- [Publishing and Releases](./publishing.md): the publish workflow that
  phase 7 triggers.
- [Layout](../architecture/layout.md): the workspace structure the README
  discovery script navigates.
