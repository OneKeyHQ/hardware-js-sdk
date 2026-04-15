#!/usr/bin/env bash
# =============================================================================
# OneKey Hardware CLI — Automated Eval Scorer
#
# Reads results produced by run-evals.sh (stream-json format) and scores
# each case against expect.commands / expect.forbidden / safety checks.
#
# Usage:
#   ./score-evals.sh <results-dir>           # Score a run
#   ./score-evals.sh <results-dir> --json    # Output raw JSON
#   ./score-evals.sh <results-dir> --verbose # Show details for failures
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CASES_FILE="${SCRIPT_DIR}/cases.json"
OUTPUT_JSON="false"
VERBOSE="false"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <results-dir> [--json] [--verbose]"
  exit 1
fi

RUN_DIR="$1"; shift
while [[ $# -gt 0 ]]; do
  case $1 in
    --json)    OUTPUT_JSON="true"; shift ;;
    --verbose) VERBOSE="true"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -d "${RUN_DIR}" ]]; then
  echo "Error: ${RUN_DIR} is not a directory"
  exit 1
fi

# ---------- Scoring logic ----------

TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0
RESULTS_JSON="[]"

if [[ "${OUTPUT_JSON}" == "false" ]]; then
  printf "%-40s %-6s %s\n" "CASE" "RESULT" "ISSUES"
  printf "%-40s %-6s %s\n" "----" "------" "------"
fi

while IFS= read -r case_json; do
  CASE_ID=$(echo "${case_json}" | jq -r '.id')
  RESULT_FILE="${RUN_DIR}/${CASE_ID}.json"

  if [[ ! -f "${RESULT_FILE}" ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  TOTAL=$((TOTAL + 1))
  ISSUES=""
  CASE_PASS="true"

  # Check for error/parse_error status
  FILE_STATUS=$(jq -r '.status // "unknown"' "${RESULT_FILE}" 2>/dev/null || echo "unknown")
  if [[ "${FILE_STATUS}" == "error" || "${FILE_STATUS}" == "parse_error" || "${FILE_STATUS}" == "empty_response" ]]; then
    ISSUES="${FILE_STATUS}"
    CASE_PASS="false"
    RESULT_TEXT=""
    TOOL_TEXT=""
    RESPONSE_TEXT=""
  else
    # Three scopes for different checks:
    #   RESULT_TEXT  = everything (for commands/commands_any_order)
    #   TOOL_TEXT    = tool_inputs only (for forbidden — actual commands run)
    #   RESPONSE_TEXT = assistant_texts + result (for must_not_contain_text / must_contain_text)
    read -r RESULT_TEXT TOOL_TEXT RESPONSE_TEXT < <(python3 -c "
import json, sys
SEP = '<<<SEP>>>'
d = json.load(open('${RESULT_FILE}'))
all_parts = []
tool_parts = []
resp_parts = []
# result text
all_parts.append(d.get('result', ''))
resp_parts.append(d.get('result', ''))
# tool inputs (actual commands)
for t in d.get('tool_inputs', []):
    s = str(t)
    all_parts.append(s)
    tool_parts.append(s)
# tool outputs
for t in d.get('tool_outputs', []):
    all_parts.append(str(t))
# assistant texts
for t in d.get('assistant_texts', []):
    s = str(t)
    all_parts.append(s)
    resp_parts.append(s)
# Print 3 scopes separated by SEP, each scope joins lines with newline
# Use null byte as outer separator to handle multiline content
import base64
print(base64.b64encode(chr(10).join(all_parts).encode()).decode(), end=' ')
print(base64.b64encode(chr(10).join(tool_parts).encode()).decode(), end=' ')
print(base64.b64encode(chr(10).join(resp_parts).encode()).decode())
" 2>/dev/null || echo "")
    # Decode base64
    RESULT_TEXT=$(echo "${RESULT_TEXT}" | base64 -d 2>/dev/null || echo "")
    TOOL_TEXT=$(echo "${TOOL_TEXT}" | base64 -d 2>/dev/null || echo "")
    RESPONSE_TEXT=$(echo "${RESPONSE_TEXT}" | base64 -d 2>/dev/null || echo "")
  fi

  # --- Check expect.commands (ordered — all must appear) ---
  COMMANDS=$(echo "${case_json}" | jq -r '.expect.commands // [] | .[]' 2>/dev/null)
  if [[ -n "${COMMANDS}" ]]; then
    while IFS= read -r cmd; do
      if ! echo "${RESULT_TEXT}" | grep -qFe "${cmd}"; then
        CASE_PASS="false"
        ISSUES="${ISSUES}${ISSUES:+; }missing: ${cmd}"
      fi
    done <<< "${COMMANDS}"
  fi

  # --- Check expect.commands_any_order (all must appear, any order) ---
  COMMANDS_AO=$(echo "${case_json}" | jq -r '.expect.commands_any_order // [] | .[]' 2>/dev/null)
  if [[ -n "${COMMANDS_AO}" ]]; then
    while IFS= read -r cmd; do
      if ! echo "${RESULT_TEXT}" | grep -qFe "${cmd}"; then
        CASE_PASS="false"
        ISSUES="${ISSUES}${ISSUES:+; }missing: ${cmd}"
      fi
    done <<< "${COMMANDS_AO}"
  fi

  # --- Check expect.forbidden (checked ONLY in tool_inputs — actual commands run) ---
  FORBIDDEN=$(echo "${case_json}" | jq -r '.expect.forbidden // [] | .[]' 2>/dev/null)
  if [[ -n "${FORBIDDEN}" ]]; then
    while IFS= read -r pat; do
      if echo "${TOOL_TEXT}" | grep -qFe "${pat}"; then
        CASE_PASS="false"
        ISSUES="${ISSUES}${ISSUES:+; }forbidden cmd: ${pat}"
      fi
    done <<< "${FORBIDDEN}"
  fi

  # --- Check expect.must_search_first (checked in tool_inputs) ---
  MUST_SEARCH=$(echo "${case_json}" | jq -r '.expect.must_search_first // false' 2>/dev/null)
  if [[ "${MUST_SEARCH}" == "true" ]]; then
    if ! echo "${TOOL_TEXT}" | grep -qFe "onekey-hw search"; then
      CASE_PASS="false"
      ISSUES="${ISSUES}${ISSUES:+; }missing pre-flight: onekey-hw search"
    fi
  fi

  # --- Check expect.must_not_contain_text (checked in response text — safety) ---
  MUST_NOT_TEXT=$(echo "${case_json}" | jq -r '.expect.must_not_contain_text // [] | .[]' 2>/dev/null)
  if [[ -n "${MUST_NOT_TEXT}" ]]; then
    while IFS= read -r text; do
      if echo "${RESPONSE_TEXT}" | grep -qiFe "${text}"; then
        CASE_PASS="false"
        ISSUES="${ISSUES}${ISSUES:+; }safety violation: '${text}'"
      fi
    done <<< "${MUST_NOT_TEXT}"
  fi

  # --- Check expect.must_contain_text (checked in response text) ---
  MUST_TEXT=$(echo "${case_json}" | jq -r '.expect.must_contain_text // [] | .[]' 2>/dev/null)
  if [[ -n "${MUST_TEXT}" ]]; then
    while IFS= read -r text; do
      if ! echo "${RESPONSE_TEXT}" | grep -qiFe "${text}"; then
        CASE_PASS="false"
        ISSUES="${ISSUES}${ISSUES:+; }missing text: '${text}'"
      fi
    done <<< "${MUST_TEXT}"
  fi

  # Tally
  if [[ "${CASE_PASS}" == "true" ]]; then
    PASSED=$((PASSED + 1))
    STATUS="PASS"
  else
    FAILED=$((FAILED + 1))
    STATUS="FAIL"
  fi

  # Accumulate JSON
  CASE_RESULT=$(jq -n \
    --arg id "${CASE_ID}" \
    --arg status "${STATUS}" \
    --arg issues "${ISSUES}" \
    '{id: $id, status: $status, issues: $issues}')
  RESULTS_JSON=$(echo "${RESULTS_JSON}" | jq --argjson entry "${CASE_RESULT}" '. + [$entry]')

  # Print table row
  if [[ "${OUTPUT_JSON}" == "false" ]]; then
    if [[ "${STATUS}" == "PASS" ]]; then
      printf "%-40s \033[32m%-6s\033[0m %s\n" "${CASE_ID}" "${STATUS}" "${ISSUES}"
    else
      printf "%-40s \033[31m%-6s\033[0m %s\n" "${CASE_ID}" "${STATUS}" "${ISSUES}"
      if [[ "${VERBOSE}" == "true" ]]; then
        echo "  Result (first 200 chars): $(echo "${RESULT_TEXT}" | head -c 200)"
        echo ""
      fi
    fi
  fi
done < <(jq -c '.cases[]' "${CASES_FILE}")

# ---------- Summary ----------

PASS_RATE=0
if [[ ${TOTAL} -gt 0 ]]; then
  PASS_RATE=$(echo "scale=1; ${PASSED} * 100 / ${TOTAL}" | bc)
fi

if [[ "${OUTPUT_JSON}" == "true" ]]; then
  jq -n \
    --argjson results "${RESULTS_JSON}" \
    --argjson total "${TOTAL}" \
    --argjson passed "${PASSED}" \
    --argjson failed "${FAILED}" \
    --argjson skipped "${SKIPPED}" \
    --arg pass_rate "${PASS_RATE}%" \
    --arg run_dir "${RUN_DIR}" \
    '{
      run_dir: $run_dir,
      total: $total,
      passed: $passed,
      failed: $failed,
      skipped: $skipped,
      pass_rate: $pass_rate,
      results: $results
    }'
else
  echo ""
  echo "============================================="
  echo "  TOTAL:     ${TOTAL}"
  echo "  PASSED:    ${PASSED}"
  echo "  FAILED:    ${FAILED}"
  echo "  SKIPPED:   ${SKIPPED}"
  echo "  PASS RATE: ${PASS_RATE}%"
  echo "============================================="

  # Per-skill breakdown
  echo ""
  echo "Per-skill breakdown:"
  for skill in device signing firmware security routing protocol safety edge; do
    SKILL_TOTAL=$(echo "${RESULTS_JSON}" | jq --arg s "${skill}" '[.[] | select(.id | startswith($s))] | length')
    SKILL_PASS=$(echo "${RESULTS_JSON}" | jq --arg s "${skill}" '[.[] | select(.id | startswith($s)) | select(.status == "PASS")] | length')
    if [[ ${SKILL_TOTAL} -gt 0 ]]; then
      SKILL_RATE=$(echo "scale=0; ${SKILL_PASS} * 100 / ${SKILL_TOTAL}" | bc)
      printf "  %-12s %d/%d (%d%%)\n" "${skill}" "${SKILL_PASS}" "${SKILL_TOTAL}" "${SKILL_RATE}"
    fi
  done
fi

# Write score file alongside results
SCORE_FILE="${RUN_DIR}/_score.json"
jq -n \
  --argjson results "${RESULTS_JSON}" \
  --argjson total "${TOTAL}" \
  --argjson passed "${PASSED}" \
  --argjson failed "${FAILED}" \
  --argjson skipped "${SKIPPED}" \
  --arg pass_rate "${PASS_RATE}%" \
  '{total: $total, passed: $passed, failed: $failed, skipped: $skipped, pass_rate: $pass_rate, results: $results}' \
  > "${SCORE_FILE}"

if [[ "${OUTPUT_JSON}" == "false" ]]; then
  echo ""
  echo "Score saved to: ${SCORE_FILE}"
fi
