#!/usr/bin/env bash
# =============================================================================
# OneKey Hardware CLI — Agent Skill Evaluation Runner
#
# Runs evaluation cases against Claude Code to verify that the agent
# correctly interprets natural language prompts and invokes the right
# CLI commands.
#
# Usage:
#   ./run-evals.sh                    # Run all cases with default model
#   ./run-evals.sh --model haiku      # Run with specific model
#   ./run-evals.sh --case device-*    # Run matching cases only
#   ./run-evals.sh --verbose          # Show detailed output
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CASES_FILE="${SCRIPT_DIR}/cases.json"
RESULTS_DIR="${SCRIPT_DIR}/results"
MODEL="${MODEL:-sonnet}"
VERBOSE="${VERBOSE:-false}"
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

mkdir -p "${RESULTS_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="${RESULTS_DIR}/eval_${MODEL}_${TIMESTAMP}.json"

echo "============================================="
echo "OneKey Hardware CLI — Eval Runner"
echo "Model: ${MODEL}"
echo "Cases: ${CASES_FILE}"
echo "Output: ${RESULT_FILE}"
echo "============================================="

# Count cases
TOTAL=$(jq '.cases | length' "${CASES_FILE}")
PASSED=0
FAILED=0
SKIPPED=0

echo "Running ${TOTAL} evaluation cases..."
echo ""

# Iterate through cases
for i in $(seq 0 $((TOTAL - 1))); do
  CASE_ID=$(jq -r ".cases[$i].id" "${CASES_FILE}")
  PROMPT=$(jq -r ".cases[$i].prompt" "${CASES_FILE}")
  MATCH_MODE=$(jq -r ".cases[$i].match_mode" "${CASES_FILE}")
  EXPECTED=$(jq -r ".cases[$i].expected_commands | join(\"; \")" "${CASES_FILE}")

  # Apply case filter if specified
  if [[ -n "${CASE_FILTER}" ]] && [[ ! "${CASE_ID}" == ${CASE_FILTER} ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo -n "[${i}/${TOTAL}] ${CASE_ID}: "

  # Run the prompt through Claude Code in non-interactive mode
  # Capture the commands that Claude would execute
  ACTUAL=$(claude --model "${MODEL}" --print \
    "You have the onekey-hardware plugin installed with skills: hardware-device, hardware-signing, hardware-firmware, hardware-security. Given this user request, list ONLY the onekey-hw commands you would run (one per line, no explanation): ${PROMPT}" \
    2>/dev/null || echo "ERROR")

  if [[ "${ACTUAL}" == "ERROR" ]]; then
    echo "SKIP (claude error)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check if expected commands appear in output
  MATCH="false"
  case "${MATCH_MODE}" in
    exact)
      if echo "${ACTUAL}" | grep -qF "${EXPECTED}"; then
        MATCH="true"
      fi
      ;;
    contains)
      ALL_FOUND="true"
      # Split on semicolons only, not spaces — commands contain spaces
      IFS=';' read -ra CMDS <<< "${EXPECTED}"
      for cmd in "${CMDS[@]}"; do
        cmd=$(echo "${cmd}" | sed 's/^ *//;s/ *$//')  # trim whitespace
        if [[ -n "${cmd}" ]] && ! echo "${ACTUAL}" | grep -qF "${cmd}"; then
          ALL_FOUND="false"
          break
        fi
      done
      MATCH="${ALL_FOUND}"
      ;;
    ordered)
      # Check commands appear in order
      LAST_POS=-1
      ALL_ORDERED="true"
      IFS=';' read -ra CMDS <<< "${EXPECTED}"
      for cmd in "${CMDS[@]}"; do
        cmd=$(echo "${cmd}" | sed 's/^ *//;s/ *$//')
        if [[ -z "${cmd}" ]]; then continue; fi
        POS=$(echo "${ACTUAL}" | grep -nF "${cmd}" | head -1 | cut -d: -f1 || echo "0")
        if [[ "${POS}" -eq 0 ]] || [[ "${POS}" -le "${LAST_POS}" ]]; then
          ALL_ORDERED="false"
          break
        fi
        LAST_POS="${POS}"
      done
      MATCH="${ALL_ORDERED}"
      ;;
  esac

  if [[ "${MATCH}" == "true" ]]; then
    echo "PASS"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
    if [[ "${VERBOSE}" == "true" ]]; then
      echo "  Expected: ${EXPECTED}"
      echo "  Actual:   ${ACTUAL}"
    fi
  fi
done

echo ""
echo "============================================="
echo "Results: ${PASSED} passed, ${FAILED} failed, ${SKIPPED} skipped (${TOTAL} total)"
echo "Pass rate: $(( PASSED * 100 / (PASSED + FAILED + 1) ))%"
echo "============================================="

# Write results JSON
jq -n \
  --arg model "${MODEL}" \
  --arg timestamp "${TIMESTAMP}" \
  --argjson passed "${PASSED}" \
  --argjson failed "${FAILED}" \
  --argjson skipped "${SKIPPED}" \
  --argjson total "${TOTAL}" \
  '{
    model: $model,
    timestamp: $timestamp,
    total: $total,
    passed: $passed,
    failed: $failed,
    skipped: $skipped,
    pass_rate: (if ($passed + $failed) > 0 then ($passed * 100 / ($passed + $failed)) else 0 end)
  }' > "${RESULT_FILE}"

echo "Results written to: ${RESULT_FILE}"
