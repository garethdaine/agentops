# Template Rendering Utility

When generating files from templates, follow these variable substitution and conditional rendering rules.

## Variable Substitution

Templates use `{{variable_name}}` syntax for placeholder values. When rendering a template:

1. Collect all required variables from the context (project detection, requirements collection, or user input)
2. Replace every `{{variable_name}}` with the actual value
3. Flag any unreplaced variables as errors — never leave `{{...}}` in generated output

### Standard Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{project_name}}` | User input or directory name | `acme-portal` |
| `{{project_description}}` | User input | `Customer portal for Acme Corp` |
| `{{framework}}` | Requirements collection | `nextjs` |
| `{{framework_version}}` | Requirements or latest stable | `14` |
| `{{database}}` | Requirements collection | `postgresql` |
| `{{orm}}` | Requirements collection | `prisma` |
| `{{auth_strategy}}` | Requirements collection | `nextauth` |
| `{{cloud_provider}}` | Requirements collection | `vercel` |
| `{{node_version}}` | Detected or default | `20` |
| `{{package_manager}}` | Detected or default | `pnpm` |
| `{{author_name}}` | Git config or user input | `Gareth Daine` |
| `{{year}}` | Current year | `2026` |
| `{{date}}` | Current date | `2026-03-17` |

## Conditional Sections

Templates use conditional blocks for stack-dependent content:

```
{{#if database}}
## Database Setup
... database-specific content ...
{{/if}}

{{#if auth_strategy}}
## Authentication
... auth-specific content ...
{{/if}}

{{#unless monorepo}}
## Single Package Setup
... single-package content ...
{{/unless}}

{{#eq framework "nextjs"}}
## Next.js Configuration
... Next.js-specific content ...
{{/eq}}
```

### Rendering Rules

1. `{{#if variable}}...{{/if}}` — Include block only if variable is truthy (non-empty, not "none", not "false")
2. `{{#unless variable}}...{{/unless}}` — Include block only if variable is falsy
3. `{{#eq variable "value"}}...{{/eq}}` — Include block only if variable equals the specified value
4. `{{#neq variable "value"}}...{{/neq}}` — Include block only if variable does not equal value

## Rendering Process

1. **Resolve variables** — Build a complete variable map from all available sources
2. **Process conditionals** — Evaluate all conditional blocks, removing blocks whose conditions are false
3. **Substitute variables** — Replace all `{{variable}}` placeholders with values
4. **Validate output** — Check for any remaining `{{...}}` markers; if found, report missing variables
5. **Format output** — Ensure proper indentation and whitespace in the final rendered content

## Usage in Commands

Enterprise commands reference this utility by including rendered templates in their output. The rendering happens inline — Claude reads the template, collects the variables, and produces the final output in a single pass. There is no separate rendering engine; Claude IS the rendering engine.

Example flow in a command:
1. Run project detection (templates/utilities/project-detection.md)
2. Run requirements collection (templates/utilities/requirements-collection.md)
3. Read the relevant template file
4. Apply variable substitution and conditional rendering per this spec
5. Write the rendered output to the target location
