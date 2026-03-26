#!/usr/bin/env bats

load test-helpers

@test "dashboard_enabled defaults to true" {
  source hooks/flag-utils.sh
  result=$(agentops_flag "dashboard_enabled" "true")
  [ "$result" = "true" ]
}

@test "agentops_dashboard_enabled helper returns true by default" {
  source hooks/flag-utils.sh
  run agentops_dashboard_enabled
  [ "$status" -eq 0 ]
}
