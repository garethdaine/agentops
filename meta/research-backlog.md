# Research Backlog

> Topics and sources for the improvement agent to research each run. Updated with findings after each cycle.

## Active Research Topics

### Agent Security (check monthly)
- arXiv search: "LLM agent security" OR "prompt injection defense" OR "tool use safety"
- Snyk blog: agent-level threat updates
- OWASP LLM Top 10 updates
- Claude Code security changelog entries

### Self-Evolving Agents (check monthly)
- arXiv search: "self-evolving agent" OR "agent skill learning" OR "agent self-improvement"
- Papers With Code: SWE-bench leaderboard changes
- Live-SWE-agent leaderboard updates

### Multi-Agent Orchestration (check monthly)
- arXiv search: "multi-agent code generation" OR "agent orchestration" OR "agent coordination"
- Claude Code Agent Teams documentation updates

### Competitor Monitoring (check weekly)
- GitHub: obra/superpowers releases and star count
- GitHub: gsd-build/get-shit-done releases
- GitHub: gsd-build/gsd-2 releases
- GitHub: cline/cline releases
- GitHub: RooVetGit/Roo-Code releases
- GitHub: continuedev/continue releases
- GitHub: Aider-AI/aider releases
- GitHub: OpenHands/OpenHands releases
- Cursor changelog
- Claude Code changelog

### Claude Code Platform (check weekly)
- code.claude.com/docs/en/changelog
- New hook types, plugin capabilities, agent features
- MCP spec updates at modelcontextprotocol.io
- New MCP servers relevant to code security/quality

## Research Findings Log

### 2026-03-26 (Run 5)
- **Claude Code changelog:** New `StopFailure` hook event (fires on API errors). `Elicitation`/`ElicitationResult` hooks for MCP elicitation interception. `${CLAUDE_PLUGIN_DATA}` persistent plugin state variable. Agent frontmatter now supports `effort`, `maxTurns`, `disallowedTools`. `SendMessage({to: agentId})` replaces deprecated `resume` parameter.
- **Relevance:** High — `StopFailure` hook, `CLAUDE_PLUGIN_DATA`, and agent frontmatter features are directly usable in AgentOps. Should add backlog items.
- **Competitor updates:** Superpowers v5.0.1 (Windows/Linux fix, Gemini CLI, skills repo separation). Aider adding Claude Sonnet 4/Opus 4 support. Cline v3.72.0 (SDK API). Critical: "Clinejection" vulnerability disclosed — prompt injection via issue triager compromised Cline production releases.
- **Relevance:** Critical — Clinejection is a real-world prompt injection incident in agent plugin ecosystem. Validates investment in injection-scan.sh.
- **Security research:** Multi-Agent Defense Pipeline (2509.14285v4) — coordinated agents detect/neutralize injections. PromptArmor (2507.15219v1) — off-the-shelf LLM pre-screens inputs, <1% false positive/negative. Design Patterns for Securing LLM Agents (2506.08837) — principled patterns for provable injection resistance.
- **Relevance:** High — PromptArmor pattern and Design Patterns paper worth reviewing for injection-scan improvements.

### 2026-03-26 (Run 2)
- **Claude Code changelog:** No new updates after v2.1.84. New `TaskCreated` hook type and HTTP-based `WorktreeCreate` hook support added. MCP tool descriptions capped at 2KB. Multi-glob pattern support in `paths:` frontmatter.
- **Relevance:** Moderate — `TaskCreated` hook could be useful for future agent orchestration features. MCP description cap may affect complex agent tool descriptions.
- **Competitor updates:** Superpowers v5.0.2 (security fix, subagent reviewer improvements). Aider v4.x (Grok-4 support, git diff fixes). Cline v3.72.0 (GPT-5 support, SDK API for programmatic access).
- **Relevance:** High — Cline's SDK API for programmatic access is a pattern worth monitoring for AgentOps extensibility.
- **Security research:** "Prompt Injection Risks in Third-Party AI Chatbot Plugins" (IEEE S&P 2026) reports 85%+ attack success rates on state-of-the-art defenses. "Prompt Injection Attacks on Agentic Coding" (2601.17548) directly relevant to code agents.
- **Relevance:** Critical — validates continued investment in injection-scan.sh and content-trust hooks.

### 2026-03-26
- **Claude Code changelog:** Plugin hooks now load immediately after installation (no restart). Hook source display added to permission prompts. Ref-tracked plugins re-clone on every load. `--bare` flag added for scripted calls (skips hooks/plugins). No breaking changes to hook API.
- **Relevance:** Low impact — AgentOps hooks already compatible. No action needed.
