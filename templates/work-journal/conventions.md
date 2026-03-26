# Work Journal Conventions

This document defines the shared conventions for all work journal commands (`/worklog`, `/idea`, `/search`). Read this file at command startup before proceeding with command-specific logic.

---

## Config Schema

All work journal commands read from `.agentops/journal-config.json`. If this file does not exist, the command must guide the user through interactive creation using `AskUserQuestion`.

### Schema

```json
{
  "identity": {
    "name": "Your Name",
    "role": "Your Role",
    "team": "Your Team"
  },
  "contacts": [
    {
      "id": "unique-id",
      "name": "Contact Name",
      "role": "Contact Role",
      "relationship": "How you work together",
      "share_categories": ["architecture_improvement", "process_improvement"]
    }
  ],
  "integrations": {
    "cortex": {
      "enabled": false,
      "memory_types": {
        "worklog": "episodic",
        "ideas": "semantic",
        "decisions": "procedural"
      }
    },
    "notion": {
      "enabled": false,
      "worklog_database_id": null,
      "ideas_database_id": null,
      "weekly_reviews_database_id": null
    }
  },
  "preferences": {
    "auto_commit": false
  }
}
```

### First-Run Setup

If `.agentops/journal-config.json` does not exist when any journal command starts:

1. Use `AskUserQuestion`: "What is your name?"
2. Use `AskUserQuestion`: "What is your role?"
3. Use `AskUserQuestion`: "What team or organisation are you in?"
4. Use `AskUserQuestion`: "Would you like to add contacts for sharing? (You can add more later)" — options: "Yes, add contacts now" / "Skip for now"
5. If adding contacts, collect: id, name, role, relationship, share_categories for each
6. Detect available integrations (see Integration Detection below) and ask about each:
   - If Cortex available: "Cortex memory system detected. Enable sync for cross-session recall?"
   - If Notion available: "Notion workspace detected. Enable sync?"
7. Write the config file to `.agentops/journal-config.json`

The contacts array is extensible — users add as many as they need. The `share_categories` field determines which contacts are suggested when sharing ideas of a given category.

### Valid Share Categories

`architecture_improvement`, `process_improvement`, `new_tool`, `client_delivery`, `cost_reduction`, `quality_improvement`, `team_workflow`, `business_opportunity`

---

## Storage Layout

All journal data is stored under `.agentops/journal/` within the project directory. This path is private by default (inside `.agentops/` which should be gitignored).

> **Hook whitelist note:** The repo's PathPolicy currently protects `.agentops/` with a small whitelist of writable state files. To allow journal writes, add `.agentops/journal/` and `.agentops/journal-config.json` to `AGENTOPS_WRITABLE_STATE` in `hooks/patterns-lib.sh`, or move journal storage to an unprotected path.

```
.agentops/journal/
  worklog/
    index.json                    # Worklog search index
    YYYY/
      MM/
        YYYY-MM-DD.md             # Daily worklog entries
    weekly/
      YYYY-Wnn.md                 # Weekly summaries
  ideas/
    index.json                    # Ideas search index
    {slug}/
      proposal.md                 # The idea proposal document
      research.md                 # Research notes (full development only)
      scratchpad.md               # Working notes
      exports/
        {slug}-proposal.pdf       # Exported PDF
        {slug}-proposal.docx      # Exported DOCX
  exports/
    worklog-YYYY-QN.pdf           # Exported worklog reports
    worklog-YYYY-QN.docx
```

### Directory Creation

Commands must create directories as needed using `mkdir -p` before writing files. Never assume directories exist.

### File Naming

- Worklog daily files: `YYYY-MM-DD.md` (ISO date, UTC)
- Weekly summaries: `YYYY-Wnn.md` (ISO week number)
- Idea directories: kebab-case slug generated from title (e.g., `tenant-caching-layer`)
- Exports: descriptive with date range (e.g., `worklog-2026-Q2.pdf`)

---

## Index Format

Two separate index files: `worklog/index.json` and `ideas/index.json`. These are flat JSON arrays optimised for search.

### Worklog Index Schema

```json
{
  "version": 1,
  "lastUpdated": "2026-03-26T16:00:00Z",
  "entries": [
    {
      "id": "wl-2026-03-26-001",
      "date": "2026-03-26",
      "time": "14:30",
      "category": "Feature delivery",
      "impact": "High",
      "title": "Shipped supplier directory with multi-tenant filtering",
      "tags": ["multi-tenant", "supplier", "feature"],
      "collaborators": "Backend team",
      "file": "2026/03/2026-03-26.md",
      "anchor": "1430-feature-delivery",
      "cortex_id": null,
      "notion_page_id": null
    }
  ]
}
```

### Ideas Index Schema

```json
{
  "version": 1,
  "lastUpdated": "2026-03-26T16:00:00Z",
  "entries": [
    {
      "id": "idea-tenant-caching-layer",
      "date": "2026-03-26",
      "title": "Implement tenant-aware caching layer",
      "category": "Architecture improvement",
      "status": "Draft",
      "beneficiaries": ["Engineering team"],
      "tags": ["caching", "multi-tenant", "performance"],
      "file": "tenant-caching-layer/proposal.md",
      "cortex_id": null,
      "notion_page_id": null
    }
  ]
}
```

### Atomic Write Protocol

All index writes MUST use the atomic write pattern to prevent corruption:

1. Write the new JSON content to a temporary file: `{index-path}.tmp`
2. Verify the temporary file is valid JSON (parse it back)
3. Rename the temporary file to the actual index path (atomic on POSIX filesystems)
4. If any step fails, leave the original index intact and log a warning

In practice within a command file, instruct the agent to:
- Write to `index.json.tmp` first
- Read it back to verify valid JSON
- Move it to `index.json` using `mv`

### Rebuild on Parse Failure

If loading an index file fails (malformed JSON, empty file, missing file):

1. Log a warning: "Index file corrupted or missing. Rebuilding from source files."
2. Scan the relevant directory for markdown files
3. For each markdown file:
   - Read frontmatter for file-level metadata (e.g., `date`, `entry_count`)
   - Parse the markdown body to identify individual entry sections and their fields
     (e.g., headings, IDs, titles, tags, timestamps, categories, impact levels)
4. Reconstruct the index entries from the combination of frontmatter and parsed
   entry metadata
5. Write the rebuilt index using the atomic write protocol
6. Continue with the rebuilt index — do NOT fail the operation

The markdown files are the source of truth. The index is a derived cache. When
rebuilding, do not rely solely on frontmatter fields like `date` and
`entry_count`; always parse the entry sections in the markdown body so the index
can be accurately reconstructed.

---

## Integration Detection

Run integration detection ONCE at command startup. Cache the results for the session. Never re-check per operation.

### Protocol

```
1. Read .agentops/journal-config.json for integration preferences
2. For each integration where config says enabled=true:

   CORTEX:
   - Attempt to call mcp__cortex__cortex_status
   - If the tool exists and returns successfully: CORTEX_AVAILABLE = true
   - If the tool does not exist or fails: CORTEX_AVAILABLE = false
   - Skip silently if unavailable

   NOTION:
   - Check if mcp__notion__notion_search tool is available
   - If available: NOTION_AVAILABLE = true
   - If unavailable: NOTION_AVAILABLE = false
   - Skip silently if unavailable

   LINEAR:
   - Check if any Linear MCP tools are available
   - If available: LINEAR_AVAILABLE = true
   - If unavailable: LINEAR_AVAILABLE = false
   - Skip silently if unavailable

3. Report detected integrations to the user ONCE:
   "Integrations: Cortex ✓, Notion ✗, Linear ✗" (or similar brief status)
   If no integrations detected: "Running in local-only mode."

4. Proceed with available integrations. Never fail due to missing integration.
```

### Local-First Write Pattern

ALL write operations follow this order:

1. Write locally to the filesystem (ALWAYS, unconditionally)
2. Update the relevant index.json (ALWAYS, using atomic write protocol)
3. If CORTEX_AVAILABLE and cortex integration enabled in config:
   - Call the appropriate cortex_write tool
   - On failure: log warning, continue (local write already succeeded)
4. If NOTION_AVAILABLE and notion integration enabled in config:
   - Call the appropriate Notion MCP tool
   - On failure: log warning, continue (local write already succeeded)

Integration sync failures NEVER block the local operation.

### Cortex Memory Mapping

When writing to Cortex, use these type and tag conventions:

| Source | Cortex Type | Tags |
|--------|------------|------|
| Worklog entry | episodic | ["worklog", "{category}", "{impact}"] |
| Weekly summary | episodic | ["worklog", "weekly-summary"] |
| Idea proposal | semantic | ["idea", "{category}", "{status}"] |
| Decision/lesson | procedural | ["decision", "{topic}"] |

### Notion Database Schemas

When Notion is available and database IDs are null, offer to create databases:

**Work Log Database:** Date (date), Category (select), Impact (select), Description (title), Collaborators (rich text), Tags (multi-select)

**Ideas Database:** Title (title), Category (select), Status (select), Date (date), Author (rich text), Beneficiaries (multi-select), Summary (rich text)

**Weekly Reviews Database:** Week (title), Date Range (rich text), Key Accomplishments (rich text), Metrics (rich text), Content (rich text)

---

## Shared Templates

### Worklog Entry Frontmatter

```yaml
---
date: "YYYY-MM-DD"
entry_count: N
---
```

### Worklog Entry Section Format

```markdown
### HH:MM — {Category}

**What:** {Description of what was accomplished}
**Impact:** {High / Medium / Low}
**Collaborators:** {Who was involved}
**Context:** Branch: {git branch}, Recent commits: {last 2-3 commits}
**Notes:** {Additional notes for future reference}
```

### Idea Proposal Frontmatter

```yaml
---
title: "{Idea Title}"
author: "{identity.name}"
date: "YYYY-MM-DD"
category: "{Category}"
status: "Draft"
slug: "{slug}"
---
```

### Idea Proposal Document Structure

```markdown
# Idea Proposal: {title}

**Author:** {identity.name}
**Role:** {identity.role}
**Date:** {YYYY-MM-DD}
**Category:** {category}
**Status:** Draft | Proposed | Approved | Implemented | Deferred

## Problem Statement
{What problem does this solve? Why does it matter?}

## Proposed Solution
{What are you proposing? Be specific.}

## Expected Benefits
{What improves if this is implemented?}

## Alternatives Considered
{What other approaches were evaluated?}

## Trade-offs & Risks
{What are the downsides or risks?}

## Implementation Sketch
{High-level approach — phases, effort, dependencies}

## Cost-Benefit Assessment
{Time/effort investment vs expected return}

## Success Metrics
{How do we measure if this worked?}

## Recommendation
{Specific next step — who should review, approve, or act on this?}

---
*Proposed by {identity.name} on {date}. Document ID: {slug}*
```

### Weekly Summary Structure

```markdown
# Weekly Summary — {YYYY-Wnn}

**Period:** {Monday date} to {Friday date}
**Author:** {identity.name}

## Key Accomplishments
{Bulleted list of highlights}

## Metrics
- Features shipped: {count}
- Code reviews: {count}
- Issues resolved: {count}
- Ideas proposed: {count}

## Decisions Made
{List of key decisions, cross-reference ADRs if they exist}

## Git Contribution Stats
{Output of git log --oneline --since=... --until=...}

## Notes for Next Week
{Anything carrying over or upcoming}
```

### Timestamp Convention

- **Storage:** All dates and times stored as ISO 8601 UTC (e.g., `2026-03-26T14:30:00Z`)
- **Filenames:** Date portion only in UTC (e.g., `2026-03-26.md`)
- **Display:** Show times in the user's local timezone when presenting to the user
- **Index entries:** Use UTC dates for consistency and timezone-safe sorting

### Export Approach

For PDF and DOCX generation, commands should follow this fallback chain:

1. **Pandoc (primary):** Check if `pandoc` is available via `which pandoc`. If available, use:
   - PDF: `pandoc input.md -o output.pdf`
   - DOCX: `pandoc input.md -o output.docx`
   - With reference template if available: `--reference-doc=template.docx`
2. **Playwright (fallback):** If pandoc unavailable, check if Playwright tools are available. Render markdown as styled HTML, then use `page.pdf()` for PDF generation. DOCX not available via Playwright.
3. **HTML (last resort):** If neither is available, generate a styled HTML file that the user can open in a browser and print to PDF. Inform the user: "Install pandoc for direct PDF/DOCX export: https://pandoc.org/installing.html"

### Auto-Tagging

When creating entries (worklog or ideas), automatically extract relevant tags from the content:
- Technology names (e.g., React, PostgreSQL, Redis)
- Project names (e.g., supplier-directory, auth-system)
- Domain concepts (e.g., multi-tenant, caching, authentication)
- Action types (e.g., shipped, fixed, designed, researched)

Store tags in lowercase, kebab-case in the index. Use for Cortex writes and Notion syncs when available.

### Feature Flag

All work journal commands check the `work_journal` flag from `.agentops/flags.json`:

```
Run: source hooks/feature-flags.sh && agentops_enterprise_enabled "work_journal"
```

If the flag is disabled, inform the user: "Work journal commands are disabled. Enable with: /agentops:flags work_journal true" and stop.

Default: `true` (commands are enabled by default as they are additive and non-destructive; missing flag entries are treated as enabled-by-default by `agentops_enterprise_enabled`).

---

*Shared conventions for `/agentops:worklog`, `/agentops:idea`, and `/agentops:search`.*
