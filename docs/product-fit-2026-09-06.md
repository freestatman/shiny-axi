# Shiny AXI: product fit and upstream review

Assessment date: 2026-09-06. Local source reviewed at `cd00bdf` (0.1.31); Lavish AXI at [`4226958`](https://github.com/kunchenguid/lavish-axi/commit/4226958) (0.1.65); AXI at [`787d774`](https://github.com/kunchenguid/axi/commit/787d774), with `axi-sdk-js` 0.1.11 in source. The local lockfile resolves SDK 0.1.8.

## Decision

Keep the project, with a narrower promise: **visual feedback on actual R Shiny apps and Quarto reports, delivered to the coding agent editing their source.** Prioritize dependable review and R-specific context over becoming a general agent workspace.

There is credible problem-solution fit, but **product-market fit is unproven**. This assessment found implementation and maintainer investment, not retention, customer interviews, willingness to pay, or comparative outcome data. Upstream popularity does not establish demand for this downstream tool. Treat the positioning as a hypothesis to test, not a market claim.

Integrate selected upstream reliability and security work. Do not merge the entire current Lavish tree, and do not interpret upgrading the SDK as upgrading the browser review engine. This documentation change does not port those fixes.

## Evidence and its limits

The assessment used implementation paths, tests, commit ancestry, upstream changes, and official ecosystem references. Existing README and architecture claims were checked against those sources rather than taken as product requirements.

| Evidence                                                                                                                              | What it supports                                                                                                                  | What it does not prove                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`src/shiny-process.js`](../src/shiny-process.js), [`src/shiny-proxy.js`](../src/shiny-proxy.js), [`src/server.js`](../src/server.js) | Managed R launch, HTTP/WebSocket proxy, source-triggered restart, and session lifecycle are real implementation responsibilities. | Universal Shiny compatibility or correct ownership in attached mode.         |
| [`src/quarto-process.js`](../src/quarto-process.js), [merged PR #1](https://github.com/freestatman/shiny-axi/pull/1)                  | Static rendering and Quarto Shiny serving are intentional additions, not just branding.                                           | Complete Quarto project/output handling or all R Markdown runtimes.          |
| [Restart commit `05941db`](https://github.com/freestatman/shiny-axi/commit/05941db)                                                   | Maintainer work addresses the edit-and-review cycle in a live app.                                                                | User retention or seamless preservation of reactive state.                   |
| [`src/artifact-sdk.js`](../src/artifact-sdk.js), [`src/session-store.js`](../src/session-store.js)                                    | Element/text targeting and persisted feedback exist.                                                                              | Pixel understanding, R source maps, or a reproducible reactive-state bundle. |
| [Merged PR #2](https://github.com/freestatman/shiny-axi/pull/2), [`skills/shiny/SKILL.md`](../skills/shiny/SKILL.md)                  | Explicit visual-review routing and R-source mapping guidance have been added.                                                     | That agents reliably follow the routing across hosts.                        |
| [AXI principles](https://axi.md), [Lavish changes](https://github.com/kunchenguid/lavish-axi/commits/main/)                           | The upstream interface and review loop have continued evolving.                                                                   | That benchmark gains from other AXI tools transfer to Shiny AXI.             |

Only two merged downstream PRs were available. Commit history supplements them; it is too small a record to infer a broad customer base or firmly established founder preferences. No customer research was conducted for this assessment.

## The user and the job

The initial user is an R developer or analyst already using a shell-capable coding agent, iterating locally on an existing Shiny app. The trigger is a visible problem whose target or interpretation is hard to convey in chat. The desired outcome is an accepted source change with fewer clarification turns and less manual context collection.

A domain expert sitting with that developer is an adjacent reviewer. A remote stakeholder who expects an account, shareable live app, comment history, and asynchronous team handoff is a different product. Current local review and HTML publishing do not fulfill that job.

Quarto report review is a sensible secondary use case: the same person may need to revise narrative, labels, tables, and plots alongside an app. It should not dilute the first-run Shiny story into “all documents and all artifacts.”

| Segment                                                    | Expected fit, to validate    | Main obstacle                                                                                                   |
| ---------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| R developer plus coding agent, frequent local UI iteration | Strongest initial hypothesis | Installation friction and whether annotations save time over ordinary chat.                                     |
| Analyst plus domain expert reviewing an app together       | Plausible adjacent use       | Retaining enough state to understand the expert's observation.                                                  |
| Quarto author revising a rendered HTML report              | Plausible secondary use      | Render latency, generated output paths, and plot context.                                                       |
| Team reviewing a deployed authenticated app remotely       | Weak current fit             | Proxy/authentication support, shared state, access control, and collaboration are outside the current contract. |
| Developer diagnosing a reactive computation or data error  | Partial fit only             | Annotation identifies a symptom; it does not inspect R execution or validate the result.                        |

## Alternatives and the reason to switch

The strongest baseline is an editor and coding agent with screenshots, not “doing nothing.” It has almost no additional setup. Shiny AXI must earn its extra server and browser surface by delivering the right target and reducing follow-up explanation.

| Alternative                                                                   | Existing advantage                                                      | Where Shiny AXI could add value                                                                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Agent chat plus screenshot or browser automation                              | Flexible; often already in the developer's workflow.                    | Human-selected targets and a continuous review loop without repeatedly assembling context.                             |
| Lavish AXI                                                                    | Maintained general HTML review core with newer reliability work.        | Own the running R process and Quarto source/render lifecycle. A static HTML copy cannot preserve a live Shiny backend. |
| [Shiny debugging tools](https://shiny.posit.co/r/articles/improve/debugging/) | Inspect execution and investigate reactive failures.                    | Communicate a visible symptom or domain judgment before debugging.                                                     |
| [shinytest2](https://rstudio.github.io/shinytest2/)                           | Repeatable automated app testing and regression checks.                 | Explore and agree on the desired change before encoding a regression test.                                             |
| [Quarto](https://quarto.org/docs/computations/r.html)                         | Execute and render the document within its existing authoring workflow. | Attach a reader's requested change to the rendered output and return it to the agent.                                  |

These are complementary jobs in several cases. There is no evidence here that replacing the editor, testing framework, or deployment stack would improve adoption.

## Does it fit AXI today?

Conceptually, yes: it gives an agent a domain-specific operation with structured observations and a next step. The browser is for the human; the CLI is for the agent. AXI is an interface-design approach and SDK, not a required central service or a promise that every tool has the same features.

Implementation alignment is mixed. `runAxiCli`, path-based sessions, structured feedback, and long polling are useful foundations. But the no-argument home response still foregrounds generic HTML creation, design guidance, and playbooks before R-specific routing. That is a product-interface mismatch even if the README says “R-first.”

AXI's current [principles](https://axi.md) also call for bounded content, clear errors, and rejecting unknown flags. The SDK cannot enforce all of this for custom command handlers. Local flag parsing is permissive and the depth-limited DOM outline has no overall node/byte budget. Assess these behaviors independently of a dependency update. Do not repeat upstream token-saving percentages as a Shiny AXI result without measuring this workflow.

The next interface change should make `shiny`, `quarto`, and their session status the first useful guidance. Retain focused R mapping knowledge, but disclose it where needed. Lavish's move to a small CLI-deferring skill is a useful pattern, not a reason to delete the downstream's R knowledge before the CLI can supply it.

## Gaps that matter to product fit

1. **Feedback reliability precedes richer context.** The current poll handler takes feedback from storage before confirming transport completion. The upstream now has restore-on-disconnect and overlapping-poll fixes. A user cannot trust “send feedback” if a disconnect can consume it without the agent seeing it.
2. **Attached mode has an ownership gap.** `watchSession` routes every `type: "shiny"` change into `runShinyRestart`; that function calls `launchShiny` even when no managed process exists. This code path can turn an attached session into a newly managed app. The README now calls the mode experimental. This finding is from source inspection; it is not a claim that an attached-mode browser reproduction was performed in this review.
3. **Reactive context is the main differentiation opportunity.** An annotation does not include an input-state bundle, interaction sequence, bookmark, or source revision. After restart, the reported case may disappear. [Shiny bookmarking](https://shiny.posit.co/r/articles/share/bookmarking-state/) is a possible app-supported mechanism, not a universal automatic fix. Test an opt-in, limited context approach before building a recorder; sensitive input values need deliberate handling.
4. **Plot and table meaning is incomplete.** The DOM snapshot walks only six levels and truncates text; it does not encode image/canvas pixels or infer chart data. Upstream image attachments and semantic table annotations are relevant candidates. DT virtualization, nested modules, Plotly, and custom htmlwidgets still need real workflow checks.
5. **The review layer can compete with the app.** Layout audits that run near first render can mistake loading or changing reactive output for a lasting defect. Upstream has shifted toward passive findings and more resilient reveal behavior. Adapt this to Shiny settling and preserve a clear way to continue reviewing.
6. **Local-first is not a full security boundary.** Current code lacks newer upstream Host/global mutation-origin checks and realpath asset confinement. The proxy also strips framing protections to embed the target. This warrants targeted hardening before promoting broader access; it is not an invitation to turn the project into a hosted service.
7. **Support breadth exceeds exercised assumptions.** The proxy uses HTTP and a plain TCP upgrade path; it is not an HTTPS/authenticated/subpath deployment adapter. Quarto output resolution assumes a sibling `.html`. Claims should remain narrower until representative workflows pass.

## Upstream integration decision

See [UPSTREAM.md](../UPSTREAM.md#review-record) for specific PRs and versions. Recommended sequence:

1. Port Host/origin and realpath protections, adapting them to the R session endpoints and proxy routes.
2. Port feedback delivery and presence fixes together with their regression cases; account for user-ended sessions.
3. Correct attached-process ownership and exercise edit/reload/end in real R workflows.
4. Update and lock the SDK after verifying hooks and error behavior; make CLI discovery R-first.
5. Adapt passive layout triage and recovery. Evaluate review-event WebSockets separately from Shiny application WebSockets.
6. Trial image attachments and semantic table targets only against observed plot/table review failures.

Defer whiteboard editing, diagram-teaching features, automatic phone access, and additional hosting UX. They may be valuable upstream, but no downstream evidence makes them the next best investment here. A shared core or extension is a credible long-term direction only if upstream offers a maintained boundary for process-backed artifacts; none is assumed in this assessment.

## PMF validation plan

Use a small, observed four-week pilot rather than introduce mandatory product telemetry. Recruit 8-12 R developers who already use coding agents and have an active app; include modular/bslib apps and a smaller number of Quarto workflows. These are proposed study targets, not existing users.

In the first week, observe installation and a full open → annotate → agent edit → re-review cycle. Use synthetic or approved data. Record failed steps, time to the first accepted change, clarification turns, and any lost feedback. Include a source-change cycle and an ended session, not just a successful launch.

In weeks two and three, have participants compare matched review tasks using their normal agent workflow and Shiny AXI, alternating order to reduce learning bias. Count manual explanation and setup time as part of the task. Ask which tool they choose for a subsequent real task without prompting.

In week four, review voluntary reuse and willingness to keep the setup, recommend it, or contribute. Ask separately who would authorize or fund team use; a useful open-source tool is not automatically a viable subscription business.

| Signal              | Proposed decision rule                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activation          | At least 8 of 10 participants complete an accepted edit-and-review loop with no maintainer intervention after onboarding.                                                 |
| Repeat use          | At least 6 of 10 voluntarily use it on three separate workdays during the pilot. Count opportunities to review, not just calendar days.                                   |
| Comparative benefit | Median time to an accepted change is at least 25% lower than the matched baseline, with no worse correctness and fewer or equal clarification turns.                      |
| Trust               | Zero observed lost-feedback or process-ownership incidents; any occurrence blocks expanding the pilot until understood. Zero observed incidents does not prove zero risk. |
| Differentiation     | Repeat users identify a concrete R-specific benefit beyond liking the annotation UI.                                                                                      |

These thresholds are provisional go/no-go heuristics for a small pilot, not statistically established PMF criteria. If users prefer screenshots once the novelty wears off, reduce the workflow cost or move the R adapters toward upstream instead of adding features. If only Quarto users return, revisit the primary segment. If setup and reliability dominate failures, improve those before measuring demand again.

## Vision evidence map and open decisions

`VISION.md` is a proposed policy, not a maintainer-approved record or a feature-completion claim. Its principles trace to the evidence above:

| Principle                              | Basis                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Review the actual result               | R/Quarto launch and proxy implementation; downstream PR #1.                                                                 |
| Distinguish intent from findings       | Separate prompt/layout-warning fields and user-ended behavior; current gate behavior exposes the tradeoff.                  |
| Context earns its cost                 | AXI interface principles, long polling, and the limits of the actual SDK snapshot.                                          |
| Respect the R workflow                 | Managed/attached entry points and source-restart history; the attached-mode gap is an explicit future acceptance criterion. |
| Share the core and earn specialization | Fork ancestry and downstream R adapters; upstream's continued general review investment.                                    |

The following boundary decisions remain open for maintainer judgment. They do not block the factual README corrections.

| Proposal                                              | Principle tested                   | Case for                                                            | Case against                                                                                    |
| ----------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Capture input values with every annotation            | Context earns its cost             | Reduces “which filter?” follow-ups.                                 | Sensitive values may cross into the agent; values alone may not reproduce state.                |
| Add opt-in Shiny bookmark capture                     | Respect the R workflow             | Reuses a native mechanism for revisiting a case.                    | Requires app cooperation and may retain data users did not intend to save.                      |
| Let severe layout errors wake the agent automatically | Human intent stays distinguishable | Recovers a blank or unusable review sooner.                         | Reactive loading can trigger unwanted edits and consume attention.                              |
| Add image attachments from Lavish                     | Context earns its cost             | Makes plot feedback intelligible beyond DOM text.                   | Adds payload/storage complexity when the agent may already have screenshots.                    |
| Support authenticated remote app review               | Scope                              | Enables domain experts to review their actual deployment.           | Expands trust, authentication, and proxy obligations beyond local iteration.                    |
| Replace the fork with upstream adapters               | Share the core                     | Reduces duplicated maintenance.                                     | No maintained extension contract is established; R workflows could lose control over lifecycle. |
| Offer a one-command generated regression test         | Respect the R workflow             | Converts accepted feedback into a durable check.                    | Adds test-generation ownership already available to the agent and shinytest2.                   |
| Make Quarto the primary entry point                   | Review the actual result           | Static document state is simpler and report review may recur often. | Could weaken the distinctive live Shiny use case before comparative evidence exists.            |

No author verdicts have been recorded. Changes in this pass: README now leads with the review job and realistic support limits; VISION establishes proposed acceptance boundaries; UPSTREAM records a dated selective-port assessment and corrects the ancestry description. Runtime implementation and dependencies remain unchanged.
