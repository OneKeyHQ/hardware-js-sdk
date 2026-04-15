#!/usr/bin/env bash
# =============================================================================
# OneKey Hardware CLI — Automated Eval Scorer
#
# Usage:
#   ./score-evals.sh <results-dir>           # Score a run
#   ./score-evals.sh <results-dir> --json    # Output raw JSON
#   ./score-evals.sh <results-dir> --verbose # Show details for failures
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CASES_FILE="${SCRIPT_DIR}/cases.json"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <results-dir> [--json] [--verbose]"
  exit 1
fi

RUN_DIR="$1"; shift
EXTRA_ARGS=("$@")

if [[ ! -d "${RUN_DIR}" ]]; then
  echo "Error: ${RUN_DIR} is not a directory"
  exit 1
fi

exec python3 "${SCRIPT_DIR}/score-evals.py" "${CASES_FILE}" "${RUN_DIR}" "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
