#!/usr/bin/env bash
# =============================================================================
# OneKey Hardware CLI — Agent Skill Evaluation Runner
#
# Aligned with app-monorepo's eval approach:
# - Invokes Claude Code in headless mode with actual skill files loaded
# - System prompt enforces skill-file-first behavior (no --help)
# - Structured JSON output per case saved to results/ directory
# - Deferred scoring via follow-up Claude invocation (LLM-as-judge)
#
# Usage:
#   ./run-evals.sh                    # Run all cases with default model
#   ./run-evals.sh --model haiku      # Run with specific model
#   ./run-evals.sh --case device-*    # Run matching cases only
#   ./run-evals.sh --verbose          # Show detailed output
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_DIR="$(dirname "${SCRIPT_DIR}")"
CASES_FILE="${SCRIPT_DIR}/cases.json"
RESULTS_DIR="${SCRIPT_DIR}/results"
MODEL="sonnet"
VERBOSE="false"
CASE_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --model) MODEL="$2"; shift 2 ;;
    --case) CASE_FILTER="$2"; shift 2 ;;
    --verbose) VERBOSE="true"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RUN_DIR="${RESULTS_DIR}/${TIMESTAMP}-${MODEL}"
mkdir -p "${RUN_DIR}"

# System prompt: force agent to use skill files, skip preflight, auto-confirm
SYSTEM_PROMPT="You have the onekey-hardware plugin installed.
BEFORE running any onekey-hw command, you MUST read the skill files at ${CLI_DIR}/skills/ to understand available commands and their parameters.
NEVER use onekey-hw --help or --help on subcommands. The skill files are your sole documentation source.
Skip all pre-flight checks (version checking) — assume CLI is installed and ready.
When a command requires user confirmation, auto-confirm YES.
If an API call fails, retry at most once before reporting the error.
Output only the onekey-hw commands you would execute, one per line. No explanations."

echo "============================================="
echo "OneKey Hardware CLI — Eval Runner"
echo "Model: ${MODEL}"
echo "Cases: ${CASES_FILE}"
echo "Output: ${RUN_DIR}"
echo "============================================="

# Model flag for claude CLI
MODEL_FLAG=""
if [[ "${MODEL}" != "sonnet" ]]; then
  MODEL_FLAG="--model ${MODEL}"
fi

# Count cases
TOTAL=$(jq '.cases | length' "${CASES_FILE}")
EXECUTED=0
SKIPPED=0

echo "Running ${TOTAL} evaluation cases..."
echo ""

# Iterate through cases
for i in $(seq 0 $((TOTAL - 1))); do
  CASE_ID=$(jq -r ".cases[$i].id" "${CASES_FILE}")
  PROMPT=$(jq -r ".cases[$i].prompt" "${CASES_FILE}")

  # Apply case filter if specified
  if [[ -n "${CASE_FILTER}" ]] && [[ ! "${CASE_ID}" == ${CASE_FILTER} ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo -n "[$((i+1))/${TOTAL}] ${CASE_ID}: "

  # Invoke Claude Code in headless mode
  # Aligned with app-monorepo: -p for prompt, --output-format json,
  # --max-turns 25, --permission-mode bypassPermissions
  RESULT_FILE="${RUN_DIR}/${CASE_ID}.json"

  if command -v claude &> /dev/null; then
    claude -p "${PROMPT}" \
      --output-format json \
      --max-turns 25 \
      --permission-mode bypassPermissions \
      --system-prompt "${SYSTEM_PROMPT}" \
      ${MODEL_FLAG} \
      > "${RESULT_FILE}" 2>/dev/null || echo '{"error": "claude invocation failed"}' > "${RESULT_FILE}"
    echo "DONE → ${RESULT_FILE}"
    EXECUTED=$((EXECUTED + 1))
  else
    echo "SKIP (claude CLI not found)"
    echo '{"error": "claude CLI not installed"}' > "${RESULT_FILE}"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "============================================="
echo "Executed: ${EXECUTED}, Skipped: ${SKIPPED} (${TOTAL} total)"
echo "Results saved to: ${RUN_DIR}"
echo "============================================="

# Write run metadata
jq -n \
  --arg model "${MODEL}" \
  --arg timestamp "${TIMESTAMP}" \
  --argjson executed "${EXECUTED}" \
  --argjson skipped "${SKIPPED}" \
  --argjson total "${TOTAL}" \
  '{
    model: $model,
    timestamp: $timestamp,
    total: $total,
    executed: $executed,
    skipped: $skipped
  }' > "${RUN_DIR}/_metadata.json"

# Print scoring instructions
echo ""
echo "To score results, run:"
echo ""
echo "  claude -p \"Read all JSON files in ${RUN_DIR}/ and the eval case definitions"
echo "  in ${CASES_FILE}. For each case, compare the actual commands executed against"
echo "  the expected commands. Produce a markdown table with columns:"
echo "  case_id | status (PASS/FAIL) | expected | actual | issues."
echo "  Also check forbidden patterns if defined. Summary at the end.\""
