---
name: pr
description: Automates the full PR workflow -- sync branches, update CHANGELOG/READMEs, create/update PR, optionally merge and publish.
arguments: [bump]
argument-hint: "<major|minor|patch> [skip=<auto-merge|auto-publish>]"
allowed-tools:
  - Bash
  - Skill
  - Edit
  - Write
  - AskUserQuestion
---

# PR Workflow

## System Role

You are a release engineer executing a structured, multi-phase PR workflow. You follow each phase in order, run scripts for mechanical operations, and use your own reasoning for content generation. If any script exits non-zero, report the failure and stop immediately. Do not attempt fixes.

## Argument Validation

Before starting any phase:

1. **`$bump`** is required. It must be one of: `major`, `minor`, `patch`. If missing or invalid, stop and tell the user.
2. Parse `$ARGUMENTS` for an optional `skip=<value>`. If present, the value must be `auto-merge` or `auto-publish`. If present with any other value, stop and tell the user the value is invalid.
3. Determine the skip behavior:
   - `skip=auto-merge`: run phases 1-4, skip phases 5-6
   - `skip=auto-publish`: run phases 1-5, skip phase 6
   - No skip: run all phases

## Phase 1: Clean and Sync Branches

1. Run the sync script:
   ```
   bun .claude/skills/pr/scripts/sync-branches.js
   ```
   If it exits non-zero, report the error and stop.

2. Invoke the `kbase` skill to update the internal knowledge base.

3. Check if any files in `.claude/kbase/` were modified. If so, stage, commit, and push those changes.

## Phase 2: Sync CHANGELOG

This phase uses your reasoning, not a script.

1. Run `git diff main...HEAD` to identify all changes on the branch.
2. Draft CHANGELOG entries for the `## [Unreleased]` section using these headings (only include sections that have content):
   - `### Added`: new features or pure enhancements that do not change existing functionality
   - `### Changed`: changes to existing functionality not covered by Added or Removed
   - `### Deprecated`: features that will be removed in a future release
   - `### Removed`: features or capabilities that were removed
   - `### Fixed`: bug fixes
   - `### Security`: vulnerability fixes
   - `### Documentation`: documentation-only changes (include only if no other sections apply)
3. Follow the existing CHANGELOG entry format: bolded summary followed by explanation text.
4. Do not use `**Breaking:**` or `**Breaking (package):**` prefixes.
5. Only document changes related to package functionality. Do not document changes to linting, testing, NPM commands, or other project structure/config.
6. Present the drafted entries to the user via `AskUserQuestion`:
   - **Proceed**: stage, commit, and push all changes, then continue
   - **Stop**: halt skill execution
7. If the user chooses Proceed, edit `CHANGELOG.md` with the drafted entries, then stage, commit, and push.

## Phase 3: Update README Docs

1. Run the find-readmes script:
   ```
   bun .claude/skills/pr/scripts/find-readmes.js
   ```
   If it exits non-zero, report the error and stop. The script outputs a JSON array of README paths.

2. Run `git diff main...HEAD` to determine what functionality changed on this branch.

3. For each README path returned by the script, update its content to reflect the changes identified in the diff. Focus on API changes, new features, removed features, and changed behavior.

4. Present the README changes to the user via `AskUserQuestion`:
   - **Proceed**: stage, commit, and push all changes, then continue
   - **Stop**: halt skill execution
5. If the user chooses Proceed, stage, commit, and push.

## Phase 4: Manage PR

1. Run the manage-pr script:
   ```
   bun .claude/skills/pr/scripts/manage-pr.js
   ```
   If it exits non-zero, report the error and stop.

2. If `skip=auto-merge` is set, the skill is done. Do not prompt the user.

3. Otherwise, present via `AskUserQuestion`:
   - **Proceed**: continue to auto-merge
   - **Stop**: halt skill execution

## Phase 5: Auto-Merge

Skip this phase entirely if `skip=auto-merge` is set.

1. Run the auto-merge script:
   ```
   bun .claude/skills/pr/scripts/auto-merge.js
   ```
   If it exits non-zero, report the error and stop.

## Phase 6: Auto-Publish

Skip this phase entirely if `skip=auto-merge` or `skip=auto-publish` is set.

1. Run the auto-publish script with the bump type:
   ```
   bun .claude/skills/pr/scripts/auto-publish.js $bump
   ```
   If it exits non-zero, report the error and stop.
