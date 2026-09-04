---
name: workout-maintenance
description: Keep the Workout project's master specification, tested source, and GitHub master branch synchronized whenever product behavior, data models, screens, persistence, import/export, or deployment-relevant code changes.
---

# Workout maintenance

Use this skill before finishing any implementation task in this repository.

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
