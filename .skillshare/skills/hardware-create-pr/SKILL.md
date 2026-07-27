---
name: hardware-create-pr
description: Create a Hardware JS SDK Pull Request from current changes, including scoped staging, validation, commit, push, and an evidence-based PR description. Invoke only when the user explicitly asks to create or submit a PR.
---

# Create Hardware SDK PR

The explicit invocation authorizes scoped commit, push, and PR creation. It does not authorize
package publication, firmware installation, physical-device mutation, or auto-merge.

1. Inspect `git status`, current branch, remotes, submodules, staged/unstaged/untracked changes, and
   conversation context. Separate requested changes from user-owned unrelated work.
2. Use `onekey` as the PR base. If currently on `onekey`, create a descriptive feature branch
   without discarding the worktree.
3. Run `yarn agent:check --profile commit`. Diagnose failures and do not modify unrelated files just
   to make the gate pass.
4. Stage only files in scope. Review the staged diff and split unrelated concerns where practical.
5. Commit as `type: short description` in English. Do not add tool attribution or
   `Co-Authored-By`.
6. Push the feature branch and run `yarn agent:check --profile pr` before declaring PR readiness.
7. Create the PR with `gh pr create --base onekey`.

Use an English PR body with applicable sections:

```markdown
## Summary

## Intent and context

## Root cause

## Design decisions

## Compatibility and risk

## Hardware coverage

## Test plan
```

Report the PR URL, validation evidence, physical-device gaps, and remaining risks. Do not update
the base branch, enable auto-merge, merge, publish, or open external applications unless explicitly
requested.
