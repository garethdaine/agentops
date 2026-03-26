## Summary

<!-- What does this PR do and why? Keep it brief — 1-3 bullet points. -->

-

## Type

<!-- Check one. -->

- [ ] `feat` — new hook, command, agent, or template
- [ ] `fix` — bug fix in existing hook/command
- [ ] `security` — security improvement or bypass fix
- [ ] `test` — new or updated BATS tests
- [ ] `docs` — documentation only
- [ ] `chore` — CI, config, dependencies
- [ ] `refactor` — no behaviour change

## Component(s) Changed

<!-- Check all that apply. -->

- [ ] `hooks/` — security hooks
- [ ] `hooks/` — automation hooks (auto-plan, auto-test, auto-verify, auto-evolve)
- [ ] `hooks/` — shared libraries (*-lib.sh)
- [ ] `commands/` — core commands
- [ ] `commands/enterprise/` — enterprise commands
- [ ] `agents/` — specialist agents
- [ ] `templates/` — project templates
- [ ] `tests/` — BATS tests
- [ ] `.github/workflows/` — CI/CD
- [ ] `settings.json` / `hooks.json` — configuration
- [ ] Other: <!-- specify -->

## Security Checklist

<!-- All PRs touching hooks/ must address these. For non-hook PRs, mark N/A. -->

- [ ] Hooks fail-closed (block on error, not allow)
- [ ] All variables are quoted (`"$VAR"`, no unquoted expansions)
- [ ] JSON parsed with `jq`, not string manipulation
- [ ] No `eval` or uncontrolled command substitution
- [ ] Input validated before use (`jq -r '.field // empty' 2>/dev/null`)
- [ ] Does not weaken any of the 7 security layers
- [ ] N/A — this PR does not touch hooks

## Testing

<!-- How was this tested? PRs touching hooks must include BATS tests. -->

- [ ] `bats tests/` passes
- [ ] New/updated BATS tests added for changed hooks
- [ ] `shellcheck hooks/*.sh` passes (no errors)
- [ ] Manually tested with Claude Code session
- [ ] N/A — no testable code changes (docs, templates)

## Feature Flags

<!-- Does this PR add, remove, or change any feature flags? -->

- [ ] No flag changes
- [ ] New flag added: `flag_name` — default: `true/false`
- [ ] Existing flag behaviour changed: `flag_name`
- [ ] Flag removed: `flag_name`

## Breaking Changes

<!-- Does this PR break backwards compatibility? -->

- [ ] No breaking changes
- [ ] Breaking: <!-- describe what breaks and migration steps -->
