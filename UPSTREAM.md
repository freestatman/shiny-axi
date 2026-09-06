# Upstream relationship

Shiny AXI is an R-first downstream project derived from [Lavish AXI](https://github.com/kunchenguid/lavish-axi). It exists to make R Shiny applications, Quarto documents, and Quarto Shiny apps reviewable in a local agent-human workflow.

It is not a general-purpose replacement for Lavish AXI. For general HTML artifacts outside R workflows, use Lavish AXI.

## Baseline and compatibility

- Upstream: [`kunchenguid/lavish-axi`](https://github.com/kunchenguid/lavish-axi)
- Recorded downstream integration point: [`c7808ceb19935a018b8cbeab0f32582fd0d736d6`](https://github.com/freestatman/shiny-axi/commit/c7808ceb19935a018b8cbeab0f32582fd0d736d6), a merge in this fork, not a Lavish source commit. Its upstream parent is [`0fa3968fdf1f7184f52a8d5eb6eeeccc106b46cb`](https://github.com/kunchenguid/lavish-axi/commit/0fa3968fdf1f7184f52a8d5eb6eeeccc106b46cb), including the layout gate after `v0.1.31`. Later local commits also contain selected upstream functionality; this ancestry marker is not a claim that every later upstream change is absent.
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

## Review record

### 2026-09-06: select reliability and safety; retain the R boundary

Reviewed local `cd00bdf`, Lavish [`4226958`](https://github.com/kunchenguid/lavish-axi/commit/4226958) (0.1.65, released September 5), and AXI [`787d774`](https://github.com/kunchenguid/axi/commit/787d774). The SDK source version is 0.1.11; the local lock resolves 0.1.8 under `^0.1.8`. **Assessment only: none of the ports below is implemented by this documentation update.**

| Candidate                                                                                                                                                                                                                                                                                                                                  | Decision                                  | Downstream reason and acceptance check                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host validation [#180](https://github.com/kunchenguid/lavish-axi/pull/180), mutation-origin protection [#257](https://github.com/kunchenguid/lavish-axi/pull/257), asset realpath confinement [#194](https://github.com/kunchenguid/lavish-axi/pull/194), submission boundaries [#235](https://github.com/kunchenguid/lavish-axi/pull/235) | Port first, with adaptation               | Localhost and lexical path checks are insufficient. Cover R launch/end routes, CLI requests, the sandboxed review flow, and assets; do not blindly allow or reject every opaque iframe origin.                                                          |
| Feedback delivery/presence [#265](https://github.com/kunchenguid/lavish-axi/pull/265), [#270](https://github.com/kunchenguid/lavish-axi/pull/270), [#301](https://github.com/kunchenguid/lavish-axi/pull/301); ended sessions [#273](https://github.com/kunchenguid/lavish-axi/pull/273)                                                   | Port as a related reliability group       | Current delivery consumes feedback before transport completion. Exercise disconnect during delivery, overlapping polls, sends while the agent works, and session end. Preserve managed R cleanup.                                                       |
| Feedback before DOM output [#266](https://github.com/kunchenguid/lavish-axi/pull/266)                                                                                                                                                                                                                                                      | Small early candidate                     | Keep user intent visible before large DOM context; verify emitted CLI output.                                                                                                                                                                           |
| Passive layout triage [#210](https://github.com/kunchenguid/lavish-axi/pull/210), loading recovery [#268](https://github.com/kunchenguid/lavish-axi/pull/268), gate recovery [#284](https://github.com/kunchenguid/lavish-axi/pull/284)                                                                                                    | Adapt policy, not just code               | Shiny outputs settle reactively. Test delayed plots, transient overflow, a genuinely blank page, and user dismissal before changing which warnings wake the agent.                                                                                      |
| Review event transport [#324](https://github.com/kunchenguid/lavish-axi/pull/324)                                                                                                                                                                                                                                                          | Plan a separate port after delivery fixes | Upstream moves review events to WebSockets to avoid browser HTTP connection-pool starvation. Shiny already has a separate application WebSocket proxy: test both upgrade routes, multiple tabs, reconnect, shutdown, and old chrome migration together. |
| Table annotation semantics [#256](https://github.com/kunchenguid/lavish-axi/pull/256); image attachments [#188](https://github.com/kunchenguid/lavish-axi/pull/188), [#248](https://github.com/kunchenguid/lavish-axi/pull/248)                                                                                                            | Pilot after reliability                   | Relevant to plots and analytical tables. Verify actual R-rendered targets and image delivery; generic table support does not guarantee DT/Plotly compatibility.                                                                                         |
| SDK 0.1.9-0.1.11: portable hook resolution [#67](https://github.com/kunchenguid/axi/pull/67), version fast path [#124](https://github.com/kunchenguid/axi/pull/124), initialization errors [#122](https://github.com/kunchenguid/axi/pull/122), project-scoped hooks [#140](https://github.com/kunchenguid/axi/pull/140)                   | Upgrade separately and verify             | Refresh the lockfile, test installed CLI hooks and errors. Project hook status/uninstall and version fast path require CLI wiring; a version bump alone does not expose them. Local `ensureStateDir` also runs before the SDK error boundary.           |
| CLI-deferring skill [#286](https://github.com/kunchenguid/lavish-axi/pull/286)                                                                                                                                                                                                                                                             | Adopt the disclosure principle            | Make the CLI R-first before reducing the focused R skills. Retain source-mapping guidance in an owned surface.                                                                                                                                          |
| Mermaid whiteboards [#166](https://github.com/kunchenguid/lavish-axi/pull/166), automatic Tailscale access [#289](https://github.com/kunchenguid/lavish-axi/pull/289), diagram teaching [#290](https://github.com/kunchenguid/lavish-axi/pull/290)                                                                                         | Defer                                     | No observed downstream R-review need justifies the added scope yet.                                                                                                                                                                                     |

The product judgment and proposed validation plan are in [the dated assessment](docs/product-fit-2026-09-06.md). Verify candidate dependencies against the then-current upstream tree before implementing; the table is not a guarantee of clean cherry-picks.

## Contributing upstream

If a fix is generic—meaning it has no R, Shiny, Quarto, or R-process dependency—prefer an upstream issue or pull request to Lavish AXI. Link that discussion from the Shiny AXI change when one exists.

Keep R-specific functionality in Shiny AXI unless the Lavish maintainer explicitly wants to own it. A shared visual-review core or formal extension API is a future collaboration topic, not a dependency of this project. Propose one only after there are several independently useful, well-understood shared changes and an upstream maintainer has agreed to maintain its API.
