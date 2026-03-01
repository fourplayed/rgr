#!/usr/bin/env bash
# code-review.sh — Launch 4 specialist agents to review a package's source code in parallel
#
# Usage:
#   ./scripts/code-review.sh <package>
#
# Packages: mobile, web, shared, config, ui

set -euo pipefail

# Allow nested claude invocations when run from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

# ── Resolve package ──

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/code-review.sh <package>"
  echo ""
  echo "Packages: mobile, web, shared, config, ui"
  exit 1
fi

PACKAGE="$1"

# Map package name to source directory
case "$PACKAGE" in
  mobile)  SRC_DIR="apps/mobile/src" ;;
  web)     SRC_DIR="apps/web/src" ;;
  shared)  SRC_DIR="packages/shared/src" ;;
  config)  SRC_DIR="packages/config/src" ;;
  ui)      SRC_DIR="packages/ui/src" ;;
  *)
    echo "Error: Unknown package '$PACKAGE'"
    echo "Valid packages: mobile, web, shared, config, ui"
    exit 1
    ;;
esac

# Resolve to absolute path relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FULL_SRC_DIR="$PROJECT_ROOT/$SRC_DIR"

if [[ ! -d "$FULL_SRC_DIR" ]]; then
  echo "Error: Source directory not found: $FULL_SRC_DIR"
  exit 1
fi

echo "=== Code Review ==="
echo "Package: $PACKAGE"
echo "Source:  $SRC_DIR"
echo ""

# ── Concatenate source files ──

echo "Collecting .ts and .tsx files..."

SOURCE_CONTENT=""
FILE_COUNT=0

while IFS= read -r file; do
  rel_path="${file#$PROJECT_ROOT/}"
  SOURCE_CONTENT+="
// ============================================================
// FILE: ${rel_path}
// ============================================================

$(cat "$file")

"
  FILE_COUNT=$((FILE_COUNT + 1))
done < <(find "$FULL_SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) | sort)

if [[ $FILE_COUNT -eq 0 ]]; then
  echo "Error: No .ts or .tsx files found in $SRC_DIR"
  exit 1
fi

LINE_COUNT=$(echo "$SOURCE_CONTENT" | wc -l | tr -d ' ')
echo "Found $FILE_COUNT files ($LINE_COUNT lines)"
echo ""

OUTPUT_DIR=$(mktemp -d)
PIDS=()

# ── Agent definitions ──

declare -a AGENT_NAMES=(
  "senior-code-reviewer"
  "typescript-specialist"
  "db-optimizer"
  "react-specialist"
)

declare -a AGENT_PROMPTS=(
  # 1. senior-code-reviewer
  "You are a SENIOR CODE REVIEWER performing a thorough code review of all source files in the '${PACKAGE}' package. Focus on:
- Bugs: Off-by-one errors, null/undefined access, unhandled exceptions, race conditions, logic errors
- Security: Injection vulnerabilities, auth gaps, sensitive data exposure, input validation
- Completeness: Missing error handling, missing edge cases, gaps in functionality
- Edge cases: Empty inputs, boundary conditions, concurrent operations, network failures
- Test coverage: Identify critical paths that lack tests, suggest what should be tested
- Code quality: Duplication, naming clarity, dead code, unnecessary complexity

This is a review of ACTUAL SOURCE CODE, not a plan. Analyze the implementation for real bugs and improvements."

  # 2. typescript-specialist
  "You are a TYPESCRIPT SPECIALIST performing a type safety review of all source files in the '${PACKAGE}' package. Focus on:
- Type safety: Find any implicit or explicit 'any' types, unsafe type assertions ('as' casts), and missing type annotations
- Null handling: Identify potential null/undefined runtime errors, missing null checks, incorrect optional chaining
- Zod alignment: Check if runtime types (Zod schemas) match TypeScript types, find mismatches between validation and type definitions
- Strict mode compliance: Find code that would fail under strict TypeScript settings (strictNullChecks, noImplicitAny, etc.)
- Generic usage: Identify places where generics would improve type safety and reuse
- Type exports: Find types that should be exported/shared but aren't, or circular type dependencies
- Discriminated unions: Find places where union types or optional fields should use discriminated unions instead

This is a review of ACTUAL SOURCE CODE, not a plan. Analyze the real types and implementations."

  # 3. db-optimizer
  "You are a DATABASE OPTIMIZATION specialist reviewing all source files in the '${PACKAGE}' package for database and data access issues. Focus on:
- Query patterns: Find N+1 queries, missing joins, over-fetching (SELECT *), and inefficient query construction
- Supabase usage: Review .from(), .select(), .rpc() calls for correctness and efficiency. Check filter usage, pagination patterns, and error handling
- RPC calls: Identify database round-trips that could be batched, missing .single() calls, incorrect .maybeSingle() usage
- RLS performance: Flag queries that may cause Row-Level Security performance issues (complex policies, missing indexes)
- Data fetching: Find redundant fetches, missing caching, or queries that should use React Query's staleTime/cacheTime
- Connection patterns: Identify unnecessary sequential queries that could be parallelized with Promise.all
- Pagination: Flag offset-based pagination that should use cursor/keyset pagination for large datasets

This is a review of ACTUAL SOURCE CODE, not a plan. Analyze the real database interactions and data access patterns."

  # 4. react-specialist
  "You are a REACT / REACT NATIVE SPECIALIST reviewing all source files in the '${PACKAGE}' package for React-specific issues. Focus on:
- Re-renders: Find unnecessary re-renders caused by inline objects/functions in JSX, missing memoization, or incorrect component structure
- Hook dependencies: Audit useEffect, useCallback, useMemo dependency arrays for missing or extra dependencies, stale closures
- FlatList performance: Check for missing keyExtractor, getItemLayout, removeClippedSubviews, and renderItem memoization
- Memo usage: Find missing React.memo on list items or expensive components, and unnecessary memo on cheap components
- State management: Identify prop drilling, misplaced state, derived state stored in useState, or useEffect for synchronization
- Accessibility: Check for missing accessibilityRole, accessibilityLabel, accessibilityHint on interactive elements
- Memory leaks: Find subscriptions, timers, or async operations without cleanup in useEffect
- Loading/error states: Identify missing loading spinners, error boundaries, or empty state handling

This is a review of ACTUAL SOURCE CODE, not a plan. Analyze the real components and hooks."
)

# ── Launch agents in parallel ──

echo "Launching 4 specialist agents..."
echo ""

for i in "${!AGENT_NAMES[@]}"; do
  name="${AGENT_NAMES[$i]}"
  prompt="${AGENT_PROMPTS[$i]}"
  output_file="$OUTPUT_DIR/${name}.md"

  (
    claude -p \
      "${prompt}

Here is the source code to review:

---
${SOURCE_CONTENT}
---

Structure your response as:
## ${name} Code Review

### Critical Issues
(numbered list, most critical first — bugs, security, correctness problems that MUST be fixed)

### Important Improvements
(numbered list — significant quality, performance, or design issues that SHOULD be addressed)

### Minor Suggestions
(numbered list — small improvements for readability, consistency, or minor optimization)

### What's Done Well
(patterns, decisions, or implementations worth acknowledging)" \
      --output-format text \
      > "$output_file" 2>/dev/null
  ) &

  PIDS+=($!)
  echo "  [$!] ${name}"
done

echo ""
echo "Waiting for all agents to complete..."
echo ""

# ── Wait and collect results ──

FAILED=0
for i in "${!PIDS[@]}"; do
  pid="${PIDS[$i]}"
  name="${AGENT_NAMES[$i]}"
  if wait "$pid"; then
    echo "  [done] ${name}"
  else
    echo "  [FAIL] ${name}"
    FAILED=$((FAILED + 1))
  fi
done

echo ""

# ── Combine output ──

TIMESTAMP=$(date '+%Y%m%d-%H%M')
REVIEW_FILE="$SCRIPT_DIR/reviews/code-review-${PACKAGE}-${TIMESTAMP}.md"

{
  echo "# Code Review — ${PACKAGE} package"
  echo ""
  echo "**Date:** $(date '+%Y-%m-%d %H:%M')"
  echo "**Source:** \`${SRC_DIR}\`"
  echo "**Files reviewed:** ${FILE_COUNT} files (${LINE_COUNT} lines)"
  echo ""
  echo "---"
  echo ""

  for name in "${AGENT_NAMES[@]}"; do
    output_file="$OUTPUT_DIR/${name}.md"
    if [[ -f "$output_file" && -s "$output_file" ]]; then
      cat "$output_file"
    else
      echo "## ${name} Code Review"
      echo ""
      echo "*Agent failed or produced no output.*"
    fi
    echo ""
    echo "---"
    echo ""
  done
} > "$REVIEW_FILE"

echo "=== Review Complete ==="
echo ""
echo "  Agents: ${#AGENT_NAMES[@]} launched, $((${#AGENT_NAMES[@]} - FAILED)) succeeded, ${FAILED} failed"
echo "  Output: ${REVIEW_FILE}"
echo ""

# Cleanup temp dir
rm -rf "$OUTPUT_DIR"
