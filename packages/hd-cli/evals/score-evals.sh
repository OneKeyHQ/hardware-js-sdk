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

if [[ ! -d "${RUN_DIR}" ]]; then
  echo "Error: ${RUN_DIR} is not a directory"
  exit 1
fi

# All scoring logic in inline Python — avoids bash multiline text issues
exec python3 - "${CASES_FILE}" "${RUN_DIR}" "$@" << 'PYTHON_SCORER'
import json
import sys
from pathlib import Path


def build_scopes(result):
    all_parts, tool_parts, resp_parts = [], [], []
    all_parts.append(result.get("result", ""))
    resp_parts.append(result.get("result", ""))
    for t in result.get("tool_inputs", []):
        s = str(t)
        all_parts.append(s)
        tool_parts.append(s)
    for t in result.get("tool_outputs", []):
        all_parts.append(str(t))
    for t in result.get("assistant_texts", []):
        s = str(t)
        all_parts.append(s)
        resp_parts.append(s)
    return "\n".join(all_parts), "\n".join(tool_parts), "\n".join(resp_parts)


def check_case(case, result):
    issues = []
    expect = case.get("expect", {})
    status = result.get("status", "unknown")
    if status in ("error", "parse_error", "empty_response", "timeout"):
        return False, [status]

    all_text, tool_text, resp_text = build_scopes(result)

    for cmd in expect.get("commands", []):
        if cmd and cmd not in all_text:
            issues.append(f"missing: {cmd}")
    for cmd in expect.get("commands_any_order", []):
        if cmd and cmd not in all_text:
            issues.append(f"missing: {cmd}")
    for pat in expect.get("forbidden", []):
        if pat and pat in tool_text:
            issues.append(f"forbidden cmd: {pat}")
    if expect.get("must_search_first", False):
        if "onekey-hw search" not in tool_text:
            issues.append("missing pre-flight: onekey-hw search")
    for text in expect.get("must_not_contain_text", []):
        if text and text.lower() in resp_text.lower():
            issues.append(f"safety violation: '{text}'")
    for text in expect.get("must_contain_text", []):
        if text and text.lower() not in resp_text.lower():
            issues.append(f"missing text: '{text}'")

    return len(issues) == 0, issues


def main():
    cases_file = sys.argv[1]
    run_dir = Path(sys.argv[2])
    extra = sys.argv[3:]
    output_json = "--json" in extra
    verbose = "--verbose" in extra

    with open(cases_file) as f:
        cases = json.load(f)["cases"]

    results = []
    total = passed = failed = skipped = 0

    if not output_json:
        print(f"{'CASE':<40} {'RESULT':<6} ISSUES")
        print(f"{'----':<40} {'------':<6} ------")

    for case in cases:
        case_id = case["id"]
        result_file = run_dir / f"{case_id}.json"
        if not result_file.exists():
            skipped += 1
            continue

        total += 1
        result = json.load(open(result_file))
        case_passed, issues = check_case(case, result)
        status = "PASS" if case_passed else "FAIL"
        if case_passed:
            passed += 1
        else:
            failed += 1

        issues_str = "; ".join(issues)
        results.append({"id": case_id, "status": status, "issues": issues_str})

        if not output_json:
            color = "\033[32m" if case_passed else "\033[31m"
            print(f"{case_id:<40} {color}{status:<6}\033[0m {issues_str}")
            if verbose and not case_passed:
                print(f"  Result: {result.get('result', '')[:200]}\n")

    pass_rate = f"{passed * 100 / total:.1f}" if total > 0 else "0"

    # Per-skill breakdown
    skill_stats = {}
    for r in results:
        c = next((c for c in cases if c["id"] == r["id"]), None)
        if c:
            skill = c.get("skill", "unknown")
            skill_stats.setdefault(skill, {"total": 0, "passed": 0})
            skill_stats[skill]["total"] += 1
            if r["status"] == "PASS":
                skill_stats[skill]["passed"] += 1

    if output_json:
        print(json.dumps({
            "run_dir": str(run_dir), "total": total, "passed": passed,
            "failed": failed, "skipped": skipped, "pass_rate": f"{pass_rate}%",
            "skill_breakdown": skill_stats, "results": results,
        }, indent=2))
    else:
        print(f"\n=============================================")
        print(f"  TOTAL:     {total}")
        print(f"  PASSED:    {passed}")
        print(f"  FAILED:    {failed}")
        print(f"  SKIPPED:   {skipped}")
        print(f"  PASS RATE: {pass_rate}%")
        print(f"=============================================\n")
        print("Per-skill breakdown:")
        for skill in ["device", "signing", "firmware", "security", "routing", "protocol", "safety", "edge"]:
            s = skill_stats.get(skill)
            if s and s["total"] > 0:
                rate = s["passed"] * 100 // s["total"]
                print(f"  {skill:<12} {s['passed']}/{s['total']} ({rate}%)")

    score_file = run_dir / "_score.json"
    with open(score_file, "w") as f:
        json.dump({"total": total, "passed": passed, "failed": failed,
                    "skipped": skipped, "pass_rate": f"{pass_rate}%",
                    "skill_breakdown": skill_stats, "results": results}, f, indent=2)

    if not output_json:
        print(f"\nScore saved to: {score_file}")

main()
PYTHON_SCORER
