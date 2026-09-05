---
name: workout-maintenance
description: Keep Workout source, SPEC.md, and GitHub synchronized after implementation changes. Also apply before any EAS operation to enforce the user's necessity check and explicit approval requirement.
---

# Workout maintenance

Use this skill before finishing any implementation task in this repository.

## EAS requires explicit user confirmation

The user requires EAS to be used only when necessary and after confirmation for the concrete operation. This applies to EAS CLI commands, equivalent API or dashboard actions, and automated workflows, including read-only account/configuration checks, project linking, credentials, builds, submissions to TestFlight/App Store, and OTA publication.

1. Complete authorized local preparation first: inspect or edit configuration files, implement code, and run local tests, lint, Vite builds, or Capacitor sync without invoking EAS. Reading official documentation also needs no EAS confirmation.
2. Establish why an EAS operation is necessary now. If local inspection answers the question, do not invoke EAS.
3. Before invoking EAS, describe the exact operation, its purpose, and whether it starts a build, changes remote state, publishes an update, or incurs known costs. Ask the user to confirm. Cite this skill's EAS rule as the source of the confirmation requirement.
4. Execute only the approved operation or explicitly approved batch. An explicit request to run that exact operation counts as confirmation; general requests such as "implement it", "prepare TestFlight", or "keep GitHub current", and prior EAS use do not. Do not request confirmation again for the same already-authorized operation.
5. If it fails, inspect local output first. A new build, submission, publication, or broader operation requires separate confirmation. Do not use another interface or automation to bypass this boundary.

Routine GitHub commit/push authorization never authorizes EAS. The final goal is an iPhone app distributed through TestFlight and then the App Store; this goal does not itself authorize builds or submissions.

## Required closeout

1. Inspect the complete working-tree diff and identify every user-visible behavior, data-model, architecture, dependency, route, or operational change.
2. Update `SPEC.md` in the same task. Treat it as the reconstruction-grade source of truth:
   - set its update date to the current local date;
   - describe final behavior, not the conversation or abandoned approaches;
   - update counts, diagrams, examples, file lists, compatibility behavior, and maintenance history affected by the change;
   - search for stale statements that contradict the implementation.
3. Run the relevant focused tests, then `npm run lint` and `npm run build`. Fix failures before publishing. Do not add tests that only mirror implementation details.
4. Review staged and unstaged files before committing. Never commit `.env`, credentials, private workout exports, generated logs, screenshots, or temporary verification harnesses. Keep the user's workout `.md` backups outside the repository.
5. Follow the repository Markdown policy: stage every created or modified tracked `.md` file with `git add`, and use `git rm`/`git mv` for Markdown deletion or movement. Do not leave untracked Markdown in the repository.
6. Commit the coherent source, tests, skill, and specification update to the current branch with a concise message. Do not amend an existing commit unless the user asks.
7. Push the commit to its configured upstream immediately. Never force-push. If the upstream has advanced, integrate it safely, rerun affected checks, and push the resulting commit.
8. Verify the remote branch resolves to the new local commit. Report the commit hash, validation, and whether production deployment remains separate.

The user's standing preference authorizes routine commits and pushes for completed Workout tasks. It does not authorize publishing private data, rewriting remote history, or deploying the `gh-pages` production site. Ask only when a genuine conflict or irreversible choice requires user input.

If work is incomplete or validation fails, do not publish a partial change merely to make GitHub current. Explain the concrete blocker instead.
