#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_evolve_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."

EVOLVE_RAN="${CWD}/.agentops/evolve-ran"

# Already ran evolve this session
[ -f "$EVOLVE_RAN" ] && exit 0

UNPROCESSED=$(agentops_unprocessed_failures "$CWD")

[ "$UNPROCESSED" -lt 2 ] && exit 0

ACTION=$(agentops_stop_action)
jq -nc --arg count "$UNPROCESSED" --arg action "$ACTION" \
  '{stopReason: ("AgentOps: " + $count + " unprocessed failures remain. You MUST run the /agentops:evolve skill now using the Skill tool (skill: \"agentops:evolve\") to process them before stopping. The evolve skill will mark completion automatically."), continue: (if $action == "block" then false else true end)}'
