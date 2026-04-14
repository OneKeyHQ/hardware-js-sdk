#!/usr/bin/env bash
# =============================================================================
# OneKey Hardware CLI — Agent Skill Evaluation Runner
#
# Usage:
#   ./run-evals.sh                    # Run all cases with default model
#   ./run-evals.sh --model haiku      # Run with specific model
#   ./run-evals.sh --case device-*    # Run matching cases only
#   ./run-evals.sh --verbose          # Show full claude output per case
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_DIR="$(dirname "${SCRIPT_DIR}")"
CASES_FILE="${SCRIPT_DIR}/cases.json"
RESULTS_DIR="${SCRIPT_DIR}/results"
MODEL=""
VERBOSE="false"
CASE_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --model)   MODEL="$2"; shift 2 ;;
    --case)    CASE_FILTER="$2"; shift 2 ;;
    --verbose) VERBOSE="true"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

MODEL_LABEL="${MODEL:-default}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RUN_DIR="${RESULTS_DIR}/${TIMESTAMP}-${MODEL_LABEL}"
mkdir -p "${RUN_DIR}"

# Build model flag
MODEL_FLAG=""
if [[ -n "${MODEL}" ]]; then
  MODEL_FLAG="--model ${MODEL}"
fi

# System prompt — aligned with app-monorepo approach
# CD to CLI_DIR handles CLAUDE.md auto-load; system prompt adds eval-mode rules
SYSTEM_PROMPT="You are testing the OneKey hardware wallet CLI (onekey-hw).

IMPORTANT RULES:
- Read the skill files FIRST before running any onekey-hw command.
- Skill files are at: ${CLI_DIR}/skills/ — read the relevant one for the task.
- NEVER use --help or --json to discover commands. Skill files are your sole source.
- Skip all pre-flight checks (version, npm view) — assume CLI is installed and ready.
- Auto-confirm YES for any AskUserQuestion prompts about device readiness.
- Do NOT pause to ask the user for clarification. Proceed with reasonable defaults.
- If a command fails, retry at most once, then report the error and continue.
- NEVER attempt firmware updates, device wipe, or seed recovery — redirect to OneKey App."

echo "============================================="
echo "OneKey Hardware CLI — Eval Runner"
echo "Model:  ${MODEL_LABEL}"
echo "Cases:  ${CASES_FILE}"
echo "Output: ${RUN_DIR}"
echo "============================================="

# Count matching cases
if [[ -n "${CASE_FILTER}" ]]; then
  TOTAL=$(jq "[.cases[] | select(.id | test(\"${CASE_FILTER}\"))] | length" "${CASES_FILE}")
else
  TOTAL=$(jq '.cases | length' "${CASES_FILE}")
fi

EXECUTED=0
SKIPPED=0

echo "Running ${TOTAL} evaluation cases..."
echo ""

# Iterate through cases using jq streaming (handles filter correctly)
jq -c '.cases[]' "${CASES_FILE}" | while IFS= read -r case_json; do
  CASE_ID=$(echo "${case_json}" | jq -r '.id')
  PROMPT=$(echo "${case_json}"  | jq -r '.prompt')

  # Apply case filter
  if [[ -n "${CASE_FILTER}" ]] && [[ ! "${CASE_ID}" =~ ${CASE_FILTER} ]]; then
    continue
  fi

  RESULT_FILE="${RUN_DIR}/${CASE_ID}.json"
  STDERR_FILE="${RUN_DIR}/${CASE_ID}.stderr"

  echo -n "[${CASE_ID}] "

  set +e
  # CD into CLI_DIR so CLAUDE.md is auto-loaded by claude
  # < /dev/null prevents stdin hang on interactive prompts
  (cd "${CLI_DIR}" && claude \
    -p "${PROMPT}" \
    --output-format json \
    --max-turns 25 \
    --permission-mode bypassPermissions \
    --system-prompt "${SYSTEM_PROMPT}" \
    ${MODEL_FLAG} \
    < /dev/null \
    > "${RESULT_FILE}" \
    2> "${STDERR_FILE}")
  EXIT_CODE=$?
  set -e

  if [[ ${EXIT_CODE} -ne 0 ]]; then
    echo "ERROR (exit ${EXIT_CODE})"
    jq -n \
      --arg id "${CASE_ID}" \
      --arg prompt "${PROMPT}" \
      --argjson exit_code "${EXIT_CODE}" \
      --arg stderr "$(cat "${STDERR_FILE}" 2>/dev/null || echo '')" \
      '{id: $id, prompt: $prompt, status: "error", exit_code: $exit_code, stderr: $stderr}' \
      > "${RESULT_FILE}"
  else
    echo "DONE"
    if [[ "${VERBOSE}" == "true" ]]; then
      jq -r '.result // .error // "no output"' "${RESULT_FILE}" 2>/dev/null | head -20
    fi
  fi

  EXECUTED=$((EXECUTED + 1))
done

echo ""
echo "============================================="
echo "Executed: ${EXECUTED} / ${TOTAL}"
echo "Results:  ${RUN_DIR}"
echo "============================================="

# Write run metadata
jq -n \
  --arg model "${MODEL_LABEL}" \
  --arg timestamp "${TIMESTAMP}" \
  --argjson total "${TOTAL}" \
  '{model: $model, timestamp: $timestamp, total: $total}' \
  > "${RUN_DIR}/_metadata.json"

# Print scoring command
echo ""
echo "To score results:"
echo ""
echo "  claude -p \"Read all JSON files in ${RUN_DIR}/ and the eval case definitions"
echo "  in ${CASES_FILE}. For each case, check: (1) Did the agent read skill files?"
echo "  (2) Were expect.commands present in the output? (3) Were expect.forbidden"
echo "  patterns absent? (4) For commands_any_order, were all commands present"
echo "  regardless of order? Output a markdown table: case_id | PASS/FAIL |"
echo "  expected | actual | issues. End with a summary score.\""
