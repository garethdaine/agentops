# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.9.x   | Yes                |
| < 0.9   | No                 |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please email **1745959+garethdaine@users.noreply.github.com** with:

- Description of the vulnerability
- Steps to reproduce
- Which hook, command, or template is affected
- Potential impact (e.g. path traversal bypass, injection escape, state tampering)

You should receive an acknowledgement within 48 hours. A fix will be prioritised based on severity:

| Severity | Target Response |
|----------|-----------------|
| Critical (bypass of security hooks, code execution) | 24 hours |
| High (partial bypass, information disclosure) | 72 hours |
| Medium (defence-in-depth weakness) | 1 week |
| Low (hardening opportunity) | Next release |

## Scope

This policy covers the AgentOps plugin itself:

- All hooks in `hooks/`
- Path, command, and environment validation
- Credential redaction
- Injection and exfiltration scanning
- Feature flag enforcement
- Build lifecycle state protection

It does **not** cover Claude Code itself — report those to [Anthropic](https://docs.anthropic.com/en/docs/claude-code).

## Recognition

Contributors who report valid security vulnerabilities will be credited in the release notes (unless they prefer to remain anonymous).
