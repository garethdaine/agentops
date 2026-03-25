---
name: tech-catalog
description: Browse, search, and update the technology reference catalog used by scaffolding and project decisions
---

You manage the AgentOps technology catalog at `templates/tech-catalog.json`. This catalog drives the options presented during scaffolding and other project decisions. It is designed to be kept current as technologies evolve.

Arguments: $ARGUMENTS

---

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for all interactive questions. DO NOT print questions as plain text.

---

## Actions

Parse the arguments to determine the action:

### No arguments — Browse catalog

Read `templates/tech-catalog.json` and present a summary:

```markdown
## Technology Catalog

**Version:** [version] | **Last updated:** [date]

| Category | Options | Example Technologies |
|----------|---------|---------------------|
| [category label] | [count] | [top 3-4 names] |
...

Commands:
- `/agentops:tech-catalog browse <category>` — view all options in a category with docs links
- `/agentops:tech-catalog add <category> <name>` — add a new technology
- `/agentops:tech-catalog remove <category> <name>` — remove a technology
- `/agentops:tech-catalog update` — interactive update session
- `/agentops:tech-catalog auto-update` — AI-driven catalog refresh (researches and proposes changes automatically)
- `/agentops:tech-catalog search <query>` — search across all categories
```

### `browse <category>` — View category details

Read the specified category from the catalog and present all options with descriptions and doc links:

```markdown
## [Category Label]

| Technology | Description | Docs |
|-----------|-------------|------|
| [name] | [description] | [link] |
...
```

### `add <category> <name>` — Add new technology

Use `AskUserQuestion` to gather:
1. question: "Brief description of [name]?" (with freeform "Other" option for typing)
2. question: "Documentation URL for [name]?" (freeform)

Then add the entry to the catalog JSON and confirm.

If the category doesn't exist, ask if a new category should be created — gather: category key, label, question text, and whether multiple selections are allowed.

### `remove <category> <name>` — Remove technology

Read the catalog, find the entry, confirm removal with AskUserQuestion, then remove and save.

### `update` — Interactive update session

Walk through the catalog category by category. For each, use `AskUserQuestion`:
- question: "Review [category]. Any changes needed?"
- options: "Looks good — skip", "Add a technology", "Remove a technology", "Update an entry"

After all categories, update the `_meta.lastUpdated` field and save.

### `auto-update` — AI-driven catalog refresh

Automatically research and update the entire catalog without manual intervention. This is the hands-off alternative to `update`.

**Process:**

1. Read the current catalog from `templates/tech-catalog.json`.
2. Use `WebSearch` to research each category for:
   - **New entrants:** Technologies that have gained significant adoption since the catalog was last updated (check `_meta.lastUpdated`). Look for new frameworks, tools, or services that have reached production-readiness and meaningful community adoption.
   - **Deprecated/dead:** Technologies that have been deprecated, abandoned, or superseded. Look for official deprecation notices, archived repositories, or successor announcements.
   - **Description drift:** Existing entries whose descriptions are now inaccurate (e.g. a tool that has expanded scope, changed ownership, or shifted focus).
   - **Broken docs links:** Verify that documentation URLs still resolve. If a docs site has moved, update the URL.
   - **Missing categories:** Consider whether any new category of tooling has emerged that warrants its own section (e.g. AI/LLM frameworks, edge runtimes, observability).
3. For each category, launch parallel `Agent` searches where possible to speed up research.
4. Compile all proposed changes into a summary table:

```markdown
## Auto-Update Proposals

| Action | Category | Technology | Reason |
|--------|----------|-----------|--------|
| ADD | [category] | [name] | [why — adoption signal, release date] |
| REMOVE | [category] | [name] | [why — deprecated, archived, superseded by X] |
| UPDATE | [category] | [name] | [what changed — description, docs URL] |
| NEW CAT | [key] | — | [why this category is needed] |
```

5. Present the summary to the user and use `AskUserQuestion`:
   - question: "Apply these catalog updates?"
   - options: "Apply all", "Let me review individually", "Cancel"
6. If "Let me review individually": walk through each proposed change with `AskUserQuestion` asking "Apply this change?" with options "Yes", "No", "Edit before applying".
7. Apply approved changes to the catalog JSON, update `_meta.lastUpdated`, bump `_meta.version` patch number, and save.
8. Present a final diff summary of what was changed.

**Research guidelines:**
- Prefer technologies with 1,000+ GitHub stars or equivalent adoption signal.
- Don't add niche or experimental tools — the catalog should reflect production-ready, broadly applicable options.
- Keep each category to a reasonable size (8–18 options). If a category is getting too large, consider whether some entries should be removed or a subcategory created.
- When in doubt about whether to add something, err on the side of not adding — the user can always add manually.
- Search queries should target "[category] framework/tool 2025 2026" to find recent entrants.

### `search <query>` — Search catalog

Search all categories for technologies matching the query (case-insensitive, partial match on name and description). Present matching results with category, description, and docs link.

---

## How to Update the Catalog

When updating `templates/tech-catalog.json`:

1. Read the current file
2. Parse as JSON
3. Apply the change (add/remove/update entry)
4. Update `_meta.lastUpdated` to today's date
5. Write back with proper JSON formatting (2-space indent)
6. Confirm the change to the user

### Entry Format

Each technology entry follows this structure:
```json
{
  "name": "Technology Name",
  "description": "One-line description of what it is and when to use it",
  "docs": "https://link-to-official-docs"
}
```

### Category Format

Each category follows this structure:
```json
{
  "label": "Human-readable category name",
  "question": "Question to ask the user during scaffolding",
  "allowMultiple": false,
  "appliesWhen": "Optional condition for when this category is relevant",
  "options": [...]
}
```

---

## Integration with Scaffold

The `/agentops:scaffold` command reads `templates/tech-catalog.json` to dynamically build its questions. When you add a category here, scaffold will automatically pick it up. When you add a technology, it becomes available as a selection option.

Categories with `allowMultiple: true` will use multiSelect in AskUserQuestion (e.g., databases, testing frameworks).

The "Other" option is always available via AskUserQuestion's built-in freeform input — users can type any technology not in the catalog.
