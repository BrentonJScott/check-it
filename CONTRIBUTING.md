# Contributing to Check-it

Thank you for helping improve Check-it. This document explains how we prefer to work together on this repository.

## Issues and discussions

- **Bug reports**: Open an issue at [https://github.com/BrentonJScott/check-it/issues](https://github.com/BrentonJScott/check-it/issues). Include what you expected, what happened, your browser and OS, and steps to reproduce.
- **Feature ideas**: Same place. A short description of the problem you are solving and how you imagine it working is enough to start.

## Pull requests

1. **Fork and branch**: Create a branch from `main` with a short, descriptive name (for example `fix-countdown-off-by-one` or `add-dark-mode-toggle`).
2. **Keep changes focused**: One logical change per pull request is easier to review than a mix of unrelated edits.
3. **Match the codebase**: Follow existing patterns for imports, naming, and component structure in `src/App.tsx` and related files.
4. **Verify locally**:
   - `npm install`
   - `npm run build` (runs `tsc --noEmit` then Vite; should complete without errors)
   - Optionally `npm run typecheck` if you only changed types and want a quicker check.
   - `npm run start` and manually exercise the flows you touched (start/stop reminders, dialog, notifications if relevant).
5. **Describe the PR**: Use a clear title and a short description of what changed and why. Link to an issue number if one exists.

## Code style

- Prefer readable, straightforward code over clever one-liners.
- Avoid drive-by refactors in files you are not changing for the task at hand.
- Do not commit secrets, API keys, or machine-specific paths.

## What we are not looking for (without discussion first)

- Large dependency additions or framework migrations.
- Broad rewrites that are not tied to a concrete bug or feature.

If you are unsure whether an idea fits, open an issue first and we can align before you invest a lot of time.

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project (ISC, as stated in `package.json`).
