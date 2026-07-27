---
name: hardware-change-plan
description: Create or review an implementation plan, technical plan, task breakdown, acceptance criteria, or validation matrix for a Hardware JS SDK change.
---

# Plan A Hardware SDK Change

1. Read the request and inspect the current worktree without changing implementation files.
2. State target runtime/transport, device family, protocol version, lifecycle phase, owning layer,
   public compatibility surface, goals, non-goals, and unresolved decisions.
3. Read the closest current code, tests, [documentation index](../../../docs/README.md), and relevant
   domain Skill. Use external sources only when local facts are insufficient.
4. Identify exact files and symbols, dependency order, generated artifacts, firmware/submodule
   coupling, error/retry/cleanup behavior, and security constraints.
5. Produce ordered implementation tasks with an acceptance condition and executable validation for
   each meaningful stage.
6. Include a transport/device/protocol test matrix and identify verification that needs a physical
   device or external system.
7. Include containment or rollback for risky compatibility changes.

Return the plan in conversation by default. When the user requests a repository artifact, place it
in the closest current topic directory under `docs/` and link it from that directory's index.

Planning authorizes analysis and plan creation only. It does not authorize implementation, push,
PR creation, publication, firmware installation, device wipe, or other external mutation.
