# Vision

`shiny-axi` exists so that an R developer or analyst can show a coding agent what needs to change in a running app or rendered report.
It serves the person reviewing the result and the agent editing its source.
It owns exactly one thing: the local visual feedback loop between that person, that agent, and an R Shiny or Quarto project.

This is a proposed product policy, grounded in the implementation and history reviewed on 2026-09-06.
It describes acceptance criteria for future changes, not a guarantee that the current release meets every criterion.
Evidence, current gaps, and unresolved tradeoffs live in [the product assessment](docs/product-fit-2026-09-06.md).

## Review the actual result

A Shiny review runs the application; a Quarto review renders or serves the document.
Controls remain usable so the reviewer can reach the state they want to discuss.
The review layer preserves the project's design and keeps changes in the owning source files.
A generated imitation of an existing app does not substitute for reviewing that app.
A selector is a clue to an R function, module, or document chunk, not proof of its location.

## Human intent stays distinguishable from machine findings

The reviewer decides what should change and whether the revised result is useful.
Annotations preserve the person's words and identify the target as precisely as the available browser evidence allows.
Layout findings remain separate from human comments and do not imply that an analysis is correct or incorrect.
A heuristic that blocks useful review must offer a clear escape.
The agent checks the source and the resulting behavior before treating a requested change as complete.
An ended review stays ended until the person requests another review.

## Context earns its cost

The CLI gives the agent actionable feedback, session state, and a concrete next step.
Waiting uses a long poll rather than repeated status requests.
R-specific guidance helps the agent connect browser evidence to source without rebuilding an IDE inside the review tool.
A DOM outline does not stand in for plot pixels, input state, a reactive trace, or data provenance.
Additional context earns its place by reducing clarification or helping reproduce the reviewed issue.
Context collection makes the data crossing into the coding agent explicit.

## Respect the R workflow

Managed mode owns the process it starts and makes restart behavior understandable.
Attached mode leaves ownership with the user's existing runner.
A source edit must not silently turn an attached session into a managed session.
A restart that loses input state is not presented as seamless state-preserving reload.
Quarto integration belongs here when it connects source and rendered review; unrelated document conversion does not.
Support claims follow exercised workflows, including their launch, feedback, edit, reload, and end paths.

## Share the core and earn the specialization

Generic review reliability and security improvements are evaluated from Lavish AXI before being rebuilt here.
AXI principles guide the agent interface; copying every upstream feature is not the goal.
R process lifecycle, reactive-review context, and Quarto rendering are the reasons to maintain this downstream project.
General diagram editing, artifact creation, and publishing features need evidence of an R review problem before becoming priorities.
If an upstream extension can preserve these workflows at lower maintenance cost, the project can become that extension.

## Scope

The primary workflow is one local reviewer working with one coding agent, with a domain expert able to review alongside the developer.
The project is not an R IDE, an autonomous app builder, a reactive debugger, a statistical validator, a regression-test runner, or a deployment platform.
Remote team collaboration, hosted app management, and Shiny for Python are not current support commitments.
The tool does not launch or supervise the coding agent.
A local review does not silently publish the artifact; agent-provider and application network behavior remain separate data boundaries.
Existing HTML export and sharing are ancillary capabilities, not the reason this project exists.

A change aligns when it helps a person communicate a concrete issue in an actual R app or report, helps the agent find and verify the corresponding source change, or makes that loop more reliable.
A change should be resisted when it expands the product without evidence of that need, obscures process or data ownership, or advertises context and compatibility the implementation cannot provide.
