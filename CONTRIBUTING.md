# Contributing

Thanks for wanting to contribute. This project follows the [AXI community contribution workflow](https://github.com/kunchenguid/axi/blob/main/CONTRIBUTING.md).

**Human-authored pull requests targeting `main` must be raised through [`no-mistakes`](https://github.com/kunchenguid/no-mistakes) v1.30.1 or newer.** We use it to run the review, test, lint, and build pipeline in an isolated worktree before opening a PR.

A GitHub Actions check (`Require no-mistakes`) verifies the deterministic signature added by that workflow. `Guard generated files` rejects hand-edits to release-please-owned files. Release and dependency bots are exempt.

## Workflow

1. Fork the repository, then clone the parent repository or point your local `origin` back to `git@github.com:freestatman/shiny-axi.git`.
2. Create a branch and make your changes.
3. Initialize or refresh the gate with your fork as its push target:

   ```sh
   no-mistakes init --fork-url git@github.com:<you>/shiny-axi.git
   ```

4. Run the checks below and commit with a conventional commit message such as `feat:`, `fix:`, or `docs:`.
5. Push through the gate instead of pushing directly to `origin`:

   ```sh
   git push no-mistakes
   ```

6. Run `no-mistakes` to attach to the pipeline, watch findings, and auto-fix or review as needed.
7. Once the pipeline passes, it pushes the branch to your fork and opens a PR against this repository.

See the [no-mistakes quick start](https://kunchenguid.github.io/no-mistakes/start-here/quick-start/) for the full first-run walkthrough.

## Repo Conventions

- Use Node 24 locally to match CI. The source remains ESM-only JavaScript validated with TypeScript `checkJs`.
- Use pnpm and run the same checks as CI before pushing:

  ```sh
  pnpm install --frozen-lockfile
  pnpm run check
  ```

- Do not hand-edit `CHANGELOG.md` or `.release-please-manifest.json`; release-please owns them and `Guard generated files` enforces that rule.
- Keep the installable `skills/shiny-axi/SKILL.md` in sync with `pnpm run build:skill`.
- Do not add generated reports, local state, screenshots, credentials, or tool evidence to the repository.

## Scope and upstream contributions

Shiny AXI is R-first: R Shiny and Quarto lifecycle, proxying, skills, examples, and documentation belong here. See [UPSTREAM.md](UPSTREAM.md) for the full ownership boundary and selective-sync policy.

- Use `R-specific` for issues and pull requests that require R, Shiny, Quarto, or their process lifecycle.
- Use `upstream-core` for a generic artifact-review fix with no R dependency. Prefer to raise that fix with [Lavish AXI](https://github.com/kunchenguid/lavish-axi) first, then link the upstream discussion in the Shiny AXI change when relevant.
- Do not merge an upstream release wholesale. Port selective changes in isolated commits, run `pnpm run check`, and update `UPSTREAM.md`'s sync table with the decision.

## Questions

Open an issue with a minimal reproduction and your `shiny-axi --version` output.
