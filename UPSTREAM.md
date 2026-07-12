# Upstream relationship

Shiny AXI is an R-first downstream project derived from [Lavish AXI](https://github.com/kunchenguid/lavish-axi). It exists to make R Shiny applications, Quarto documents, and Quarto Shiny apps reviewable in a local agent-human workflow.

It is not a general-purpose replacement for Lavish AXI. For general HTML artifacts outside R workflows, use Lavish AXI.

## Baseline and compatibility

- Upstream: [`kunchenguid/lavish-axi`](https://github.com/kunchenguid/lavish-axi)
- Initial source baseline: Lavish AXI commit [`c7808ceb19935a018b8cbeab0f32582fd0d736d6`](https://github.com/kunchenguid/lavish-axi/commit/c7808ceb19935a018b8cbeab0f32582fd0d736d6), which includes `v0.1.31` plus the then-unreleased layout-warning and layout-gate changes.
- License: upstream-derived code remains subject to the repository's MIT license and retained copyright notice.

Shiny AXI retains selected `lavish-*` DOM hooks and postMessage names as an internal compatibility protocol. They are not Shiny AXI's public product branding or a promise of complete API compatibility with Lavish AXI.

## Ownership boundary

| Area                                                                                            | Maintained by                                  |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Generic artifact review concepts, annotation protocol, browser chrome, and export safety fixes  | Upstream first when the change can stand alone |
| R Shiny process lifecycle, attached-app proxying, WebSocket handling, and R project conventions | Shiny AXI                                      |
| Quarto rendering, Quarto Shiny lifecycle, and document watching                                 | Shiny AXI                                      |
| Shiny/Quarto skills, examples, and R-specific documentation                                     | Shiny AXI                                      |

## Selective sync policy

Shiny AXI does not automatically merge every upstream release. Review upstream releases monthly, and also review promptly for security fixes or a generic bug that affects Shiny AXI users.

For each review:

1. Identify the upstream release or commit and the user-visible reason to consider it.
2. Port only the relevant change in an isolated commit; do not perform a blind merge or rebrand sweep.
3. Run the full Shiny AXI verification suite and test the affected Shiny or Quarto workflow.
4. Record the decision below, including skipped changes and any compatibility note.

| Date | Upstream release / commit | Decision                | Notes                                         |
| ---- | ------------------------- | ----------------------- | --------------------------------------------- |
| —    | —                         | No reviews recorded yet | Add the first entry when this policy is used. |

## Contributing upstream

If a fix is generic—meaning it has no R, Shiny, Quarto, or R-process dependency—prefer an upstream issue or pull request to Lavish AXI. Link that discussion from the Shiny AXI change when one exists.

Keep R-specific functionality in Shiny AXI unless the Lavish maintainer explicitly wants to own it. A shared visual-review core or formal extension API is a future collaboration topic, not a dependency of this project. Propose one only after there are several independently useful, well-understood shared changes and an upstream maintainer has agreed to maintain its API.
