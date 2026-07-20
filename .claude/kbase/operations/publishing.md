# Publishing and Releases

How `sleepy-serv` and `sleepy-socket` get to npm, and why the pipeline is shaped
the way it is. Both packages are versioned in **lockstep** and always ship together.

## Trigger model: `workflow_dispatch`, not GitHub Releases

Releases are cut by manually running the publish workflow and choosing a bump type
(`patch` / `minor` / `major` / `prerelease`). The workflow derives everything else:
version, tag, GitHub Release, and both npm publishes.

The earlier model was the opposite: a human created a GitHub Release, and CI derived
the version from the tag. That was abandoned for two reasons.

- **The tag never matched the manifest.** The tag was cut before CI bumped
  `package.json`, so checking out a release tag gave you a manifest claiming the
  *previous* version.
- **GitHub has no pre-release hook.** Every `release` activity type (`published`,
  `created`, `prereleased`, ...) fires *after* the release and its tag already exist.
  Actions events report; they cannot veto. So a release-triggered workflow can never
  fail before something permanent exists.

`workflow_dispatch` inverts this: all validation runs first, and nothing permanent is
created until it passes.

Constraints worth knowing: `workflow_dispatch` accepts **`inputs` only**. There is no
`branches` filter (those apply to `push`, `pull_request`, `pull_request_target`, and
`workflow_run`). The workflow file must live on the default branch for the Run button
to appear, but the caller picks which ref executes, and *that ref's copy of the file
runs*. Branch restriction therefore has to be enforced at runtime or by the
environment, not declaratively in `on:`.

## The ordering invariant

**npm publishing is the only irreversible step, so it goes last.**

npm never allows a version to be reused. Per npm's unpublish policy, unpublishing does
not free the version: "Once `package@version` has been used, you can never use it
again." Unpublish is therefore not a rollback mechanism. Fixing forward is the only
real option.

Everything else the workflow does (commit, tag, GitHub Release) is reversible. So the
order is:

```
validate -> test -> compute version -> registry pre-flight
  -> commit -> push commit + tag -> publish npm -> create Release
```

This was learned the hard way. The `0.6.0` release published both packages and *then*
failed to push, leaving npm a full release ahead of the repository and requiring a
manual reconciliation PR. With the current order that same failure costs nothing,
because nothing has been published yet.

The GitHub Release is created last deliberately: it is the signal that the entire
release succeeded, so it should never exist for a release that did not finish.

## Registry pre-flight

Before anything mutable, the workflow asserts two things per package against
`registry.npmjs.org`:

1. the computed version is **not already published**, and
2. the computed version is **greater than** that package's current `dist-tags.latest`.

The second check is not redundant. npm accepts publishing a version lower than
`latest`; it simply never becomes `latest`. Without this guard, manifest drift silently
produces a release nobody installs. That exact drift existed once, when manifests said
`0.4.0` while npm's latest was `0.5.0`.

Both packages are checked before failing, so one run reports every problem.

This strictness is a deliberate trade against re-runnability: after a partial failure,
a re-run now aborts rather than guessing. Recovery is a manual `npm publish` from
whichever package missed.

## Authentication

**OIDC trusted publishing**, no stored npm tokens. npm revoked all classic tokens on
2025-12-09, and granular write tokens cap at 90 days, so stored-credential publishing
is not viable long term.

Two consequences that are easy to trip over:

- **Trusted publishing cannot perform a package's first publish.** The Trusted
  Publisher config lives on the package's settings page, which does not exist until the
  package does. A brand-new package must be published once by hand to break the cycle.
  This is why `sleepy-socket@0.0.1` exists as a placeholder.
- **`bun publish` does not support OIDC.** It fails with `missing authentication` under
  GitHub Actions OIDC. CI therefore shells out to `npm` for the publish step only
  (`bunx npm@11 publish`); bun is still used for install, test, and version bumping.
  Ubuntu runners ship npm 10.x by default, which predates OIDC support (needs >= 11.5.1).

## Repository rulesets are invisible to the branch-protection API

`main` is protected by a **ruleset** requiring pull requests and a passing `build`
check. Rulesets and classic branch protection are separate systems:

```
GET /repos/{owner}/{repo}/branches/main/protection  ->  404 Branch not protected
GET /repos/{owner}/{repo}/rulesets                  ->  the actual rule
```

A `404` from the first endpoint says nothing about whether the branch is protected.
This trap caused a real outage: the workflow was converted to push with `GITHUB_TOKEN`
on the strength of that `404`, and the push was rejected by the ruleset.

The release commit is pushed using a **GitHub App token**, because the ruleset grants
bypass to an Integration actor and not to `GITHUB_TOKEN`. Check `bypass_actors` on the
ruleset before assuming any credential can push.

## `GITHUB_TOKEN` versus App tokens

Events generated with `GITHUB_TOKEN` **do not trigger other workflow runs**. This is
GitHub's recursion guard. App tokens and PATs have no such protection.

This cuts both ways and both directions matter here:

- The GitHub Release is created with `GITHUB_TOKEN` so it cannot re-trigger anything.
- The push needs an App token, purely because of the ruleset bypass above.

## Changelog

`CHANGELOG.md` at the repo root, [Keep a Changelog](https://keepachangelog.com/) format,
one file covering both packages (they version in lockstep, so splitting it would mean
deciding which package every entry belongs to).

Entries accumulate under `## [Unreleased]` during normal development and are reviewed in
the PR alongside the code. At release, the workflow renames that heading to the version
with the date and opens a fresh empty `[Unreleased]`. The extracted section becomes the
GitHub Release body.

Two ordering details this depends on:

- Notes must be extracted **before** promotion, since promoting empties the section.
- An empty `[Unreleased]` fails the run early. Releasing with no notes is nearly always
  a mistake, and it also blocks a double-promote.

## Tooling quirks

- **`bun pm version <x>` exits non-zero when the version is unchanged**
  (`error: Version not changed`). Any workflow that re-runs a bump step will fail on the
  second pass.
- **`npm publish --prefix <dir>` does not work.** It sets the config prefix but still
  publishes the package in the current directory, so in this workspace it reads the
  private root manifest and dies on a missing version. Use the folder argument
  (`npm publish ./packages/server`) or `working-directory`.
- **npm tarball checksums are not reproducible across environments**, even when file
  contents are byte-identical, because of tar and gzip metadata. To verify a rebuild
  matches a published artifact, extract and `diff -r` rather than comparing shasums.

## See also

- [Layout](../architecture/layout.md): the workspace structure these packages live in.
- [Real-time / WebSocket Layer](../architecture/websocket.md): including the client
  bundling constraints that shape what `sleepy-socket` may import.
