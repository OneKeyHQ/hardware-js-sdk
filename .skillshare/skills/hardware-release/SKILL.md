---
name: hardware-release
description: Prepare an explicitly authorized Hardware JS SDK version, package build, compatibility check, npm publication, release notes, or release PR. Never invoke implicitly.
---

# Hardware SDK Release

1. Confirm authorization, target version, dist tag, packages, base branch, and whether publication
   is included.
2. Inspect the worktree, submodules, package versions, and pending generated artifacts.
3. Run `yarn check-versions` before changing or publishing versions.
4. Run `yarn agent:check --profile pr`; investigate failures with focused commands.
5. Confirm public API, events/errors, protocol/device compatibility, generated schemas, examples,
   and release notes.
6. Show the exact publication plan and affected packages before any irreversible external action.
7. Publish, push tags, create releases, or enable auto-merge only when explicitly authorized.

Do not combine unrelated dependency upgrades, firmware submodule movement, or generated build
artifacts with a release.
