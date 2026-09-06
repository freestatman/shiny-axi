# Security policy

## Supported versions

Shiny AXI is pre-1.0. Security fixes are applied to the latest published npm version and the current `main` branch; older releases are not maintained separately.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability or include secrets, local file contents, or private application data in a report.

Use [GitHub private vulnerability reporting](https://github.com/freestatman/shiny-axi/security/advisories/new). Include the affected version, operating system, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within seven days.

For non-sensitive hardening ideas, open a normal issue instead.

## Security boundaries

- The server binds to loopback by default. Setting `SHINY_AXI_HOST` to a non-loopback address exposes an unauthenticated local-file review server; do this only on a trusted network.
- Shiny and Quarto code runs with the current user's permissions. Review untrusted projects before launching them.
- `shiny-axi share` sends a self-contained artifact to the third-party `ht-ml.app` service. Shared pages are public unless password protection is selected. Never share secrets or sensitive data.
