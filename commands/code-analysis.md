---
name: code-analysis
description: Run a structured code analysis on the current project or specified path
---

Run a structured code analysis using the `code-critic` agent.

## Process

1. **Determine scope:** If `$ARGUMENTS` specifies a path or glob pattern, use that. Otherwise, analyze the full project working directory.
2. **Snapshot:** Use Glob and Grep to build a quick inventory of the codebase:
   - File count and types (by extension)
   - Tech stack detection (package.json, composer.json, Cargo.toml, go.mod, requirements.txt, Gemfile, etc.)
   - Entry points and key structural files
3. **Plan analysis tasks:** Based on the detected stack, select relevant analysis passes from:
   - **Filesystem manifest:** directory structure, file distribution, naming conventions
   - **Dependency audit:** outdated/unused/duplicate dependencies, version constraints
   - **Architecture patterns:** separation of concerns, layering, module boundaries
   - **Code quality:** readability, naming, DRY, SOLID violations, complexity hotspots
   - **Performance risks:** N+1 queries, unnecessary allocations, missing indexes, blocking I/O
   - **Test coverage map:** test file to source file mapping, coverage gaps, assertion quality
   - **Risk hotspots:** files with high churn + high complexity, large files, deeply nested logic
   - **Security surface:** credential exposure, injection vectors, auth gaps (delegate to `security-reviewer` agent if available)
4. **Execute:** Dispatch the `code-critic` agent (and optionally `security-reviewer` agent in parallel) to perform each analysis pass. Each agent should reference exact file paths and line numbers.
5. **Report:** Compile findings into a structured report and write it to `docs/discovery/code-analysis/{project-name}.md` with:
   - Summary stats (files, lines, stack, dependencies)
   - Findings by category, ordered by severity (critical > high > medium > low)
   - Concrete recommendations with file:line references
   - A risk score (0-100) based on finding density and severity

## IMPORTANT: This is a read-only, reporting tool.

- Do NOT fix, patch, or modify any code during or after analysis.
- Do NOT edit any files other than the report output in `docs/discovery/code-analysis/`.
- Present the report summary to the user and STOP.
- Wait for explicit user instructions before taking any action on findings.
- If the user asks you to fix findings, treat that as a separate task requiring its own STAR plan.

Arguments: $ARGUMENTS
