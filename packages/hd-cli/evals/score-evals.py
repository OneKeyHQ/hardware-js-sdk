#!/usr/bin/env python3
"""OneKey Hardware CLI — Automated Eval Scorer"""

import json
import os
import re
import sys
from pathlib import Path


def load_result(result_file: Path) -> dict:
    with open(result_file) as f:
        return json.load(f)


def build_scopes(result: dict) -> tuple[str, str, str]:
    """Build three text scopes from a result file:
    - all_text:  everything (for commands/commands_any_order matching)
    - tool_text: tool_inputs only (for forbidden — actual commands run)
    - resp_text: assistant_texts + result (for must_contain_text / must_not_contain_text)
    """
    all_parts = []
    tool_parts = []
    resp_parts = []

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


def check_case(case: dict, result: dict) -> tuple[bool, list[str]]:
    """Score a single case. Returns (passed, issues)."""
    issues = []
    expect = case.get("expect", {})

    status = result.get("status", "unknown")
    if status in ("error", "parse_error", "empty_response"):
        return False, [status]

    all_text, tool_text, resp_text = build_scopes(result)

    # Check expect.commands (all must appear in all_text)
    for cmd in expect.get("commands", []):
        if cmd and cmd not in all_text:
            issues.append(f"missing: {cmd}")

    # Check expect.commands_any_order (all must appear in all_text)
    for cmd in expect.get("commands_any_order", []):
        if cmd and cmd not in all_text:
            issues.append(f"missing: {cmd}")

    # Check expect.forbidden (only in tool_text — actual commands run)
    for pat in expect.get("forbidden", []):
        if pat and pat in tool_text:
            issues.append(f"forbidden cmd: {pat}")

    # Check expect.must_search_first (in tool_text)
    if expect.get("must_search_first", False):
        if "onekey-hw search" not in tool_text:
            issues.append("missing pre-flight: onekey-hw search")

    # Check expect.must_not_contain_text (in resp_text, case-insensitive)
    for text in expect.get("must_not_contain_text", []):
        if text and text.lower() in resp_text.lower():
            issues.append(f"safety violation: '{text}'")

    # Check expect.must_contain_text (in resp_text, case-insensitive)
    for text in expect.get("must_contain_text", []):
        if text and text.lower() not in resp_text.lower():
            issues.append(f"missing text: '{text}'")

    return len(issues) == 0, issues


def main():
    if len(sys.argv) < 3:
        print("Usage: score-evals.py <cases.json> <results-dir> [--json] [--verbose]")
        sys.exit(1)

    cases_file = sys.argv[1]
    run_dir = Path(sys.argv[2])
    output_json = "--json" in sys.argv
    verbose = "--verbose" in sys.argv

    with open(cases_file) as f:
        cases = json.load(f)["cases"]

    results = []
    total = 0
    passed = 0
    failed = 0
    skipped = 0

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
        result = load_result(result_file)
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
            reset = "\033[0m"
            print(f"{case_id:<40} {color}{status:<6}{reset} {issues_str}")
            if verbose and not case_passed:
                resp = result.get("result", "")[:200]
                print(f"  Result: {resp}")
                print()

    # Pass rate
    pass_rate = f"{passed * 100 / total:.1f}" if total > 0 else "0"

    # Per-skill breakdown
    skill_stats = {}
    for r in results:
        # Extract skill prefix from case id
        for prefix in ["device", "signing", "firmware", "security", "routing", "protocol", "safety", "edge",
                        "get-", "sign-", "nostr-", "lnurl-", "sol-", "conflux-", "aptos-", "ton-", "evm-",
                        "verify-", "passphrase-", "param-", "lock-", "setup-", "connection-", "bootloader-",
                        "change-", "remove-", "enable-", "haptic-"]:
            pass  # skip complex prefix matching

        # Use the skill field from cases instead
        matching_case = next((c for c in cases if c["id"] == r["id"]), None)
        if matching_case:
            skill = matching_case.get("skill", "unknown")
            if skill not in skill_stats:
                skill_stats[skill] = {"total": 0, "passed": 0}
            skill_stats[skill]["total"] += 1
            if r["status"] == "PASS":
                skill_stats[skill]["passed"] += 1

    if output_json:
        print(json.dumps({
            "run_dir": str(run_dir),
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "pass_rate": f"{pass_rate}%",
            "skill_breakdown": skill_stats,
            "results": results,
        }, indent=2))
    else:
        print()
        print("=============================================")
        print(f"  TOTAL:     {total}")
        print(f"  PASSED:    {passed}")
        print(f"  FAILED:    {failed}")
        print(f"  SKIPPED:   {skipped}")
        print(f"  PASS RATE: {pass_rate}%")
        print("=============================================")
        print()
        print("Per-skill breakdown:")
        for skill in ["device", "signing", "firmware", "security", "routing", "protocol", "safety", "edge"]:
            s = skill_stats.get(skill)
            if s and s["total"] > 0:
                rate = s["passed"] * 100 // s["total"]
                print(f"  {skill:<12} {s['passed']}/{s['total']} ({rate}%)")

    # Write score file
    score_file = run_dir / "_score.json"
    with open(score_file, "w") as f:
        json.dump({
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "pass_rate": f"{pass_rate}%",
            "skill_breakdown": skill_stats,
            "results": results,
        }, f, indent=2)

    if not output_json:
        print()
        print(f"Score saved to: {score_file}")


if __name__ == "__main__":
    main()
