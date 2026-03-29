#!/bin/bash
set -euo pipefail

# PostToolUse hook — fires after any Bash tool use in the orchestrator session.
# Detects spawn commands (claude invocations) and logs them to status/.sessions.
# Non-spawn bash commands are ignored silently.

input=$(cat)

# Extract the command that was run
tool_input=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only act on claude spawn commands
if [[ "$tool_input" != *"claude "* ]] || [[ "$tool_input" != *"--system-prompt"* ]]; then
  exit 0
fi

# Extract project directory from the command (expects cd <dir> && claude ...)
project_dir=$(echo "$tool_input" | sed -n 's/^cd \([^ ]*\) &&.*/\1/p')

# Extract task summary (the last quoted argument to claude)
task_summary=$(echo "$tool_input" | grep -oE '"[^"]*"$' | tr -d '"' | head -c 200)

# Fallback if extraction failed
if [[ -z "$project_dir" ]]; then
  project_dir="unknown"
fi

if [[ -z "$task_summary" ]]; then
  task_summary="unknown"
fi

# Ensure status directory exists
status_dir="${CLAUDE_PLUGIN_ROOT}/status"
mkdir -p "$status_dir"

# Append session record
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "${timestamp} | ${project_dir} | ${task_summary} | stage:discovery" >> "${status_dir}/.sessions"

exit 0
