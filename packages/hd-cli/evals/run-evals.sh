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

# System prompt — eval-mode rules on top of CLAUDE.md auto-loaded from CLI_DIR
SYSTEM_PROMPT="You are testing the OneKey hardware wallet CLI (onekey-hw).

IMPORTANT RULES:
- Read the skill files FIRST before running any onekey-hw command.
- Skill files are at: ${CLI_DIR}/skills/ — read the relevant one for the task.
- NEVER use --help to discover commands. Skill files are your sole source of truth.
- Skip all pre-flight checks (version, npm view) — assume CLI is installed and ready.
- Auto-confirm YES for any AskUserQuestion prompts about device readiness.
- Do NOT pause to ask the user for clarification. Proceed with reasonable defaults.
- If a command fails, retry at most once, then report the error and move on.
- NEVER attempt firmware updates, device wipe, or seed recovery — redirect to OneKey App.
- When redirecting to OneKey App, give the guidance and STOP. Do not continue with other operations.
- Keep it minimal: run only the commands needed for the task. Do not add extra exploratory steps."

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
ERRORS=0
EMPTY=0

echo "Running ${TOTAL} evaluation cases..."
echo ""

# Use process substitution instead of pipe to avoid subshell counter bug
while IFS= read -r case_json; do
  CASE_ID=$(echo "${case_json}" | jq -r '.id')
  PROMPT=$(echo "${case_json}"  | jq -r '.prompt')

  # Apply case filter
  if [[ -n "${CASE_FILTER}" ]] && [[ ! "${CASE_ID}" =~ ${CASE_FILTER} ]]; then
    continue
  fi

  RESULT_FILE="${RUN_DIR}/${CASE_ID}.json"
  STREAM_FILE="${RUN_DIR}/${CASE_ID}.stream.jsonl"
  STDERR_FILE="${RUN_DIR}/${CASE_ID}.stderr"

  echo -n "[${CASE_ID}] "

  set +e
  # CD into CLI_DIR so CLAUDE.md is auto-loaded by claude
  # < /dev/null prevents stdin hang on interactive prompts
  # stream-json + verbose captures tool calls for automated scoring
  # max-turns 6: most cases need 2-4 turns (read skill + search + command + result)
  (cd "${CLI_DIR}" && claude \
    -p "${PROMPT}" \
    --output-format stream-json \
    --verbose \
    --max-turns 6 \
    --permission-mode bypassPermissions \
    --system-prompt "${SYSTEM_PROMPT}" \
    ${MODEL_FLAG} \
    < /dev/null \
    > "${STREAM_FILE}" \
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
    ERRORS=$((ERRORS + 1))
  elif [[ ! -s "${STREAM_FILE}" ]]; then
    # Empty stream — likely rate limit or silent failure
    echo "EMPTY (no output)"
    jq -n \
      --arg id "${CASE_ID}" \
      --arg prompt "${PROMPT}" \
      '{id: $id, prompt: $prompt, status: "empty_response"}' \
      > "${RESULT_FILE}"
    EMPTY=$((EMPTY + 1))
  else
    # Parse stream-json into structured result for scoring
    python3 -c "
import json
lines = open('${STREAM_FILE}').readlines()
result_obj = None
tool_inputs = []
tool_outputs = []
assistant_texts = []
for line in lines:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except:
        continue
    t = obj.get('type', '')
    if t == 'result':
        result_obj = obj
    elif t == 'assistant':
        msg = obj.get('message', {})
        for block in msg.get('content', []):
            if block.get('type') == 'tool_use':
                tool_inputs.append(json.dumps(block.get('input', {})))
            elif block.get('type') == 'text':
                assistant_texts.append(block.get('text', ''))
    elif t == 'tool_result':
        content = obj.get('content', '')
        if isinstance(content, list):
            for item in content:
                tool_outputs.append(json.dumps(item) if isinstance(item, dict) else str(item))
        else:
            tool_outputs.append(str(content))

combined = {
    'result': result_obj.get('result', '') if result_obj else '',
    'tool_inputs': tool_inputs,
    'tool_outputs': tool_outputs,
    'assistant_texts': assistant_texts,
    'num_turns': result_obj.get('num_turns', 0) if result_obj else 0,
    'duration_ms': result_obj.get('duration_ms', 0) if result_obj else 0,
    'total_cost_usd': result_obj.get('total_cost_usd', 0) if result_obj else 0,
    'status': 'success'
}
json.dump(combined, open('${RESULT_FILE}', 'w'), indent=2)
"

    if [[ ! -f "${RESULT_FILE}" ]]; then
      jq -n --arg id "${CASE_ID}" '{id: $id, status: "parse_error"}' > "${RESULT_FILE}"
      ERRORS=$((ERRORS + 1))
    fi

    echo "DONE"
    if [[ "${VERBOSE}" == "true" ]]; then
      jq -r '.result // "no output"' "${RESULT_FILE}" 2>/dev/null | head -20
    fi
  fi

  EXECUTED=$((EXECUTED + 1))
done < <(jq -c '.cases[]' "${CASES_FILE}")

echo ""
echo "============================================="
echo "Executed: ${EXECUTED} / ${TOTAL}"
echo "Errors:   ${ERRORS}"
echo "Empty:    ${EMPTY}"
echo "Results:  ${RUN_DIR}"
echo "============================================="

# Write run metadata
jq -n \
  --arg model "${MODEL_LABEL}" \
  --arg timestamp "${TIMESTAMP}" \
  --argjson total "${TOTAL}" \
  --argjson executed "${EXECUTED}" \
  --argjson errors "${ERRORS}" \
  --argjson empty "${EMPTY}" \
  '{model: $model, timestamp: $timestamp, total: $total, executed: $executed, errors: $errors, empty: $empty}' \
  > "${RUN_DIR}/_metadata.json"

echo ""
echo "To score results, run:"
echo "  ${SCRIPT_DIR}/score-evals.sh ${RUN_DIR}"
