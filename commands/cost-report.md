---
name: cost-report
description: Display current session cost tracking and budget status
---

Read `.agentops/budget.json` and display the current budget status:

- **Budget:** Total allocated USD
- **Spent:** Amount used so far
- **Remaining:** Budget minus spent
- **Warning threshold:** Percentage at which warnings trigger
- **Status:** OK / WARNING / EXCEEDED
- **Session started:** Timestamp

If `.agentops/budget.json` doesn't exist, report that budget tracking is not initialized and suggest starting a session with `AGENTOPS_BUDGET_USD` set.

Arguments: $ARGUMENTS
