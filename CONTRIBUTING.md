# Contributing to AgentOps

Thanks for your interest in contributing! This guide covers how to report issues, suggest features, and submit pull requests.

## Reporting Bugs

1. Search [existing issues](https://github.com/garethdaine/agentops/issues) first to avoid duplicates.
2. Open a new issue with:
   - Steps to reproduce
   - Expected vs actual behaviour
   - Claude Code version (`claude --version`)
   - OS and shell (e.g. macOS 15 / zsh)
   - Relevant hook or command name (if applicable)

## Suggesting Features

Open an issue with the `enhancement` label. Include:
- What problem the feature solves
- How you envision it working
- Which phase of the build lifecycle it affects (if any)

## Submitting Pull Requests

### Setup

```bash
git clone https://github.com/garethdaine/agentops.git
cd agentops
```

### Testing

All PRs must pass the existing test suite:

```bash
# Install BATS (if not already installed)
brew install bats-core    # macOS
# or: apt install bats    # Debian/Ubuntu

# Run tests
bats tests/
```

If your change touches a hook, add or update the relevant BATS test in `tests/`.

### Code Style

- **Shell scripts:** Use `set -uo pipefail`. Quote variables. Use `jq` for JSON output.
- **Markdown commands/agents:** Follow the existing frontmatter format (`name`, `description`).
- **Templates:** Keep language-agnostic where possible.
- **Commit messages:** Use [conventional commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, `test:`.

### PR Process

1. Fork the repo and create a branch from `main`.
2. Make your changes. Keep PRs focused — one feature or fix per PR.
3. Run `bats tests/` and confirm all tests pass.
4. Open a PR against `main` with a clear description of what and why.
5. PRs are reviewed for security implications (this is a guardrails plugin — security matters).

### What We Look For

- Does the change maintain or improve security posture?
- Are hooks fail-closed by default?
- Is the change tested?
- Does it follow existing patterns in the codebase?

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Questions?

Open a [discussion](https://github.com/garethdaine/agentops/discussions) or file an issue.
