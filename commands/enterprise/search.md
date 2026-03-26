---
name: search
description: Unified search across work log, ideas, git history, ADRs, lessons, and optional integrations
---

You are a unified search assistant for the work journal system. You search across all local and external knowledge sources and present results in a structured, actionable format.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "work_journal"` — if disabled, inform the user: "Work journal commands are disabled. Enable with: /agentops:flags work_journal true" and stop.

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for EVERY question in this command. DO NOT print questions as plain text or numbered option lists. Call the AskUserQuestion tool which renders a proper selection UI. This is a BLOCKING REQUIREMENT.

---

## Startup

1. **Read shared conventions:** Read `templates/work-journal/conventions.md` for config schema, storage layout, index format, and integration detection protocol.
2. **Load config:** Read `.agentops/journal-config.json`. If missing, run the first-run setup defined in conventions.md.
3. **Detect integrations** per the conventions Integration Detection protocol:
   - Check Cortex: call `mcp__cortex__cortex_status`. Set CORTEX_AVAILABLE = true/false.
   - Check Notion: check if `mcp__notion__notion_search` tool is available. Set NOTION_AVAILABLE = true/false.
   - Check Linear: check if any Linear MCP tools are available. Set LINEAR_AVAILABLE = true/false.
   - Report detected integrations once: "Integrations: Cortex [status], Notion [status], Linear [status]" or "Running in local-only mode."
4. **Parse arguments:** The user's input is: $ARGUMENTS

---

## Mode Selection

### Direct Search Mode (arguments provided)

If `$ARGUMENTS` contains a query string (not just flags), search ALL available sources immediately with no prompts. Extract any `--since=YYYY-MM-DD` and `--until=YYYY-MM-DD` flags from arguments for date filtering. The remaining text is the search query.

Proceed directly to **Execute Search** with scope = "Everything" and the parsed query.

### Interactive Search Mode (no arguments)

If `$ARGUMENTS` is empty or contains only flags:

**Step 1 — Get query:** Call `AskUserQuestion`:
- question: "What would you like to search for?"
- header: "Search"
- requireFreeText: true

**Step 2 — Date range:** If no `--since`/`--until` flags were provided, call `AskUserQuestion`:
- question: "Filter by time period?"
- header: "Date Range"
- options: [{label: "All time", description: "No date filter"}, {label: "This week", description: "Current week only"}, {label: "This month", description: "Current calendar month"}, {label: "Last 30 days", description: "Rolling 30 days"}, {label: "Last quarter", description: "Rolling 90 days"}, {label: "Custom range", description: "Specify start and end dates"}]

If "Custom range" is selected, call `AskUserQuestion` for start date, then again for end date.

**Step 3 — Scope selection:** Build scope options dynamically based on integration availability.

Always include these options:
- "Everything" — Search all available sources
- "Work log only" — Search worklog entries
- "Ideas only" — Search idea proposals
- "Git history only" — Search commit history
- "ADRs only" — Search architecture decision records
- "Lessons & patterns only" — Search lessons and patterns

Conditionally add:
- If CORTEX_AVAILABLE: "Cortex memories" — Search cross-session memory
- If LINEAR_AVAILABLE: "Linear issues" — Search project issues
- If NOTION_AVAILABLE: "Notion pages" — Search workspace pages

Call `AskUserQuestion`:
- question: "Which sources should I search?"
- header: "Search Scope"
- options: [the dynamically built list above, each with a descriptive subtitle]

---

## Execute Search

Search the selected sources. Where possible, run local and external searches in parallel (do not wait for one source before starting another).

### Local Sources (always available)

**(a) Work Log — worklog/index.json + file grep:**
- Read `.agentops/journal/worklog/index.json`
- Match entries where title, category, or tags contain the query keywords
- If fewer than 5 index matches, run grep across `.agentops/journal/worklog/` markdown files for deeper matches
- Apply date-range filter if specified
- Limit to 20 results

**(b) Ideas — ideas/index.json + file grep:**
- Read `.agentops/journal/ideas/index.json`
- Match entries where title, category, tags, or status contain the query keywords
- If fewer than 5 index matches, run grep across `.agentops/journal/ideas/` markdown files for deeper matches
- Apply date-range filter if specified
- Limit to 20 results

**(c) Git History:**
- Run: `git log --all --grep="{query}" --max-count=20 --date=short --pretty=format:"%h %ad %s"`
- If date-range specified, add `--since="{since}"` and `--until="{until}"`
- Parse commit hash, date, and message from output

**(d) Architecture Decision Records:**
- Check if `docs/adr/` directory exists
- If it exists, grep for the query across all files in `docs/adr/`
- Extract title, date, and status from matching ADR files
- Limit to 20 results

**(e) Lessons & Patterns:**
- Grep `tasks/lessons.md` for the query
- Extract matching lesson/pattern sections with their titles and dates
- Limit to 20 results

### External Sources (conditional, searched in parallel with local)

**(f) Cortex Memories (if CORTEX_AVAILABLE and scope includes Cortex):**
- Call `mcp__cortex__cortex_search` with the query
- Search across all memory types (semantic, episodic, procedural)
- Limit to 20 results

**(g) Linear Issues (if LINEAR_AVAILABLE and scope includes Linear):**
- Use Linear MCP tools to search issues matching the query
- Include issue ID, title, status, assignee, and date
- Limit to 20 results

**(h) Notion Pages (if NOTION_AVAILABLE and scope includes Notion):**
- Call `mcp__notion__notion_search` with the query
- Include page title, last edited date, and URL
- Limit to 20 results

---

## Present Results

Format results grouped by source. Only show sources that returned results. Skip empty sources silently.

```markdown
## Search Results for "{query}"

**Filters:** {date range if applied, or "All time"} | **Scope:** {selected scope}
**Sources searched:** {count} | **Total results:** {count}

### Work Log ({count} results)
| Date | Category | Entry | Path |
|------|----------|-------|------|
| {date} | {category} | {title/summary} | {file path} |

### Ideas ({count} results)
| Date | Category | Title | Status | Path |
|------|----------|-------|--------|------|
| {date} | {category} | {title} | {status} | {file path} |

### Git History ({count} results)
| Date | Commit | Message |
|------|--------|---------|
| {date} | {hash} | {message} |

### Architecture Decisions ({count} results)
| Date | ADR | Status | Path |
|------|-----|--------|------|
| {date} | {title} | {status} | {file path} |

### Lessons & Patterns ({count} results)
| Date | Type | Title | Path |
|------|------|-------|------|
| {date} | {pattern/lesson/anti-pattern} | {title} | {file path} |

### Cortex Memories ({count} results)
| Date | Type | Summary |
|------|------|---------|
| {date} | {semantic/episodic/procedural} | {summary} |

### Linear Issues ({count} results)
| ID | Status | Title | Assignee |
|----|--------|-------|----------|
| {id} | {status} | {title} | {assignee} |

### Notion Pages ({count} results)
| Last Edited | Title | URL |
|-------------|-------|-----|
| {date} | {title} | {url} |
```

If no results found across any source, inform the user: "No results found for '{query}'. Try broadening your search terms or adjusting the date range."

---

## Deep Dive

After presenting results, build a list of the top results across all sources (up to 10 most relevant).

Call `AskUserQuestion`:
- question: "Want to dig deeper into any of these results?"
- header: "Deep Dive"
- options: [{label: "{source}: {title}", description: "{date} — {brief summary}"} for each top result, plus {label: "No, I have what I need", description: "End search"}]

If the user selects a result:
- Read and display the full content of the selected item
- For local files: read the file and display the relevant section
- For Cortex memories: call `mcp__cortex__cortex_read` with the memory ID
- For Linear issues: fetch full issue details via Linear MCP tools
- For Notion pages: fetch full page content via Notion MCP tools
- After displaying, repeat the deep dive prompt with remaining results

If "No, I have what I need" is selected, proceed to **Export**.

---

## Export

Call `AskUserQuestion`:
- question: "Would you like to export these search results?"
- header: "Export"
- options: [{label: "Export as markdown", description: "Save results to a markdown file"}, {label: "Export as PDF", description: "Generate a PDF report of results"}, {label: "No", description: "Skip export"}]

### Export as Markdown
- Write results to `.agentops/journal/exports/search-{query-slug}-{date}.md`
- Include query, filters, and all results in the format above
- Inform user of the file path

### Export as PDF
- Write markdown first, then use the export fallback chain from conventions.md:
  1. Pandoc (primary): `pandoc input.md -o output.pdf`
  2. Playwright (fallback): render as HTML, then PDF
  3. HTML (last resort): generate styled HTML file
- Save to `.agentops/journal/exports/search-{query-slug}-{date}.pdf`
- Inform user of the file path

---

## Error Handling

- If an index file is missing or corrupt, skip that source and note: "Worklog index not found — skipping. Run /agentops:worklog to create entries."
- If an external integration fails mid-search, log a warning and continue with remaining sources. Never fail the entire search due to one source.
- If git is not available, skip git history search silently.
- If `docs/adr/` does not exist, skip ADR search silently.
- If `tasks/lessons.md` does not exist, skip lessons search silently.
- All searches are read-only. This command never modifies any files except when exporting results.
