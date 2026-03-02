#!/usr/bin/env bash
# db-review.sh — Launch db-optimizer and typescript-specialist agents
# to perform a comprehensive database structure analysis across the
# mobile app, shared package, and Supabase backend.
#
# Usage:
#   ./scripts/db-review.sh
#
# Output:
#   scripts/reviews/db-review-YYYYMMDD-HHMM.md

set -euo pipefail

# Allow nested claude invocations when run from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

# ── Resolve project paths ──

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MOBILE_SRC="$PROJECT_ROOT/apps/mobile/src"
SHARED_SRC="$PROJECT_ROOT/packages/shared/src"
MIGRATION_DIR="$PROJECT_ROOT/supabase/migrations"
FUNCTIONS_DIR="$PROJECT_ROOT/supabase/functions"

for dir in "$MOBILE_SRC" "$SHARED_SRC" "$MIGRATION_DIR" "$FUNCTIONS_DIR"; do
  if [[ ! -d "$dir" ]]; then
    echo "Error: Required directory not found: $dir"
    exit 1
  fi
done

echo "=== Database Review ==="
echo "Scope: mobile + shared + supabase (migrations, edge functions)"
echo ""

# ── Collect source files ──

collect_files() {
  local label="$1"
  local dir="$2"
  shift 2
  local find_args=("$@")

  local content=""
  local count=0

  while IFS= read -r file; do
    rel_path="${file#$PROJECT_ROOT/}"
    content+="
// ============================================================
// FILE: ${rel_path}
// ============================================================

$(cat "$file")

"
    count=$((count + 1))
  done < <(find "$dir" -type f "${find_args[@]}" | sort)

  echo "$content"
  echo "  $label: $count files" >&2
}

echo "Collecting source files..."

# 1. SQL migrations
MIGRATIONS_CONTENT=$(collect_files "Migrations" "$MIGRATION_DIR" -name "*.sql")

# 2. Supabase edge functions
FUNCTIONS_CONTENT=$(collect_files "Edge functions" "$FUNCTIONS_DIR" -name "*.ts")

# 3. Shared package — services, types, utils
SHARED_CONTENT=$(collect_files "Shared package" "$SHARED_SRC" \( -name "*.ts" -o -name "*.tsx" \))

# 4. Mobile package — hooks, stores, contexts (data access layer only)
MOBILE_HOOKS_CONTENT=""
MOBILE_HOOK_COUNT=0
for subdir in hooks store stores contexts; do
  target="$MOBILE_SRC/$subdir"
  if [[ -d "$target" ]]; then
    while IFS= read -r file; do
      rel_path="${file#$PROJECT_ROOT/}"
      MOBILE_HOOKS_CONTENT+="
// ============================================================
// FILE: ${rel_path}
// ============================================================

$(cat "$file")

"
      MOBILE_HOOK_COUNT=$((MOBILE_HOOK_COUNT + 1))
    done < <(find "$target" -type f \( -name "*.ts" -o -name "*.tsx" \) | sort)
  fi
done
echo "  Mobile hooks/stores: $MOBILE_HOOK_COUNT files"

# Combine all source content
ALL_CONTENT="${MIGRATIONS_CONTENT}

${FUNCTIONS_CONTENT}

${SHARED_CONTENT}

${MOBILE_HOOKS_CONTENT}"

TOTAL_LINES=$(echo "$ALL_CONTENT" | wc -l | tr -d ' ')
echo ""
echo "Total: $TOTAL_LINES lines across all sources"
echo ""

# ── Temp directory for agent output ──

OUTPUT_DIR=$(mktemp -d)
PIDS=()

# ── Agent definitions ──

declare -a AGENT_NAMES=(
  "db-optimizer"
  "typescript-specialist"
)

declare -a AGENT_PROMPTS=(
  # 1. db-optimizer
  "You are a DATABASE OPTIMIZATION specialist performing a comprehensive analysis of a fleet management system built on PostgreSQL (via Supabase). You are reviewing the FULL database layer: SQL migrations, RPC functions, edge functions, the shared service layer, and the mobile app's data access hooks.

Analyze every aspect of the database architecture and provide expert recommendations:

## SCHEMA DESIGN
- Table normalization: Are tables properly normalized? Are there over-normalization issues hurting read performance?
- Column types: Are the right PostgreSQL types used? (e.g., TIMESTAMPTZ vs TIMESTAMP, UUID vs SERIAL, JSONB vs structured columns)
- Constraints: Are foreign keys, unique constraints, NOT NULL, and CHECK constraints comprehensive?
- Enum design: Are PostgreSQL enums the right choice vs lookup tables? Migration implications?
- Soft deletes: Is the deleted_at pattern correctly implemented? Partial indexes covering it?
- Denormalization: Are denormalized fields (e.g., last_latitude on assets) kept in sync? Race conditions?

## INDEX STRATEGY
- Missing indexes: Identify queries in the service layer that lack supporting indexes
- Redundant indexes: Find indexes that overlap or are never used by actual query patterns
- Composite index ordering: Are multi-column indexes ordered correctly for the queries that use them?
- BRIN vs B-tree: Are BRIN indexes used appropriately? Would GIN or GiST help for any patterns?
- Partial indexes: Are WHERE clauses on partial indexes aligned with actual query filters?
- Index bloat risks: Any tables with high churn that need index maintenance considerations?

## QUERY PERFORMANCE
- N+1 queries: Identify service functions that make multiple sequential queries instead of joins
- Over-fetching: Find SELECT * patterns or queries that fetch columns not used by the caller
- Under-fetching: Find cases where multiple queries could be combined into one
- Join patterns: Are .select() with embedded relations used efficiently? Missing foreign key hints?
- Pagination: Evaluate offset vs keyset pagination choices for each data volume scenario
- Count queries: Are exact counts ({count: 'exact'}) used where estimates would suffice?
- RPC efficiency: Are RPC functions optimal? Could any be rewritten or consolidated?

## ROW-LEVEL SECURITY
- Policy performance: Identify RLS policies that cause sequential scans or slow joins
- Policy gaps: Find tables or operations that may lack proper RLS coverage
- Policy duplication: Spot redundant policies that could be consolidated
- Auth function usage: Is auth.uid() and auth.jwt() used efficiently in policies?

## DATA ACCESS PATTERNS (Service Layer)
- Connection management: Is the Supabase client used efficiently? Connection pooling concerns?
- Error handling: Are database errors properly categorized and surfaced?
- Transaction safety: Identify multi-step operations that should be atomic but aren't
- Batch operations: Find loops that should use batch inserts/upserts
- Cache alignment: Are React Query staleTime/cacheTime values appropriate for each data type's change frequency?

## EDGE FUNCTIONS
- Auth verification: Are edge functions properly validating auth tokens?
- Error handling: Are database errors handled gracefully?
- Rate limiting: Is the rate limiting implementation sound? Any bypass vectors?

## MIGRATION QUALITY
- Idempotency: Can migrations be re-run safely?
- Rollback strategy: Are there any migrations that would be hard to reverse?
- Data migration: Are there any schema changes that should have included data migration steps?

Provide specific, actionable recommendations. Reference exact table names, column names, file paths, and line numbers. Prioritize by impact on production performance and reliability."

  # 2. typescript-specialist
  "You are a TYPESCRIPT SPECIALIST performing a comprehensive type safety analysis of the data layer in a fleet management system. You are reviewing the FULL data pipeline: database types, entity mappers, Zod validation schemas, service functions, and React Query hooks.

Analyze the complete type chain from database to UI and provide expert recommendations:

## TYPE PIPELINE INTEGRITY
- Row-to-Entity mapping: Are all database columns accounted for in Row types? Any fields silently dropped or mis-typed during mapping?
- Mapper correctness: Do mapRowToEntity() functions handle null/undefined columns correctly? Are date conversions (string → Date) safe?
- Insert/Update types: Do CreateXInput and UpdateXInput types match what the database expects? Missing required fields? Extra fields that get silently ignored?
- Enum alignment: Do TypeScript string literal unions match PostgreSQL enum values exactly? What happens if a new enum value is added in SQL but not in TypeScript?

## ZOD SCHEMA ALIGNMENT
- Schema ↔ Type drift: Find Zod schemas that don't match their TypeScript counterpart (extra fields, wrong types, missing optional markers)
- Validation completeness: Are all user-facing inputs validated through Zod? Any service functions that accept raw unvalidated input?
- Schema reuse: Are there duplicate validation patterns that should use shared Zod schemas?
- Transform safety: Are Zod .transform() and .refine() functions type-safe?

## SERVICE LAYER TYPE SAFETY
- Return types: Are service functions explicitly typed or relying on inference? Could inference produce unexpected types?
- Error typing: Is ServiceResult<T> used consistently? Any service functions that throw instead of returning errors?
- Supabase query typing: Are .from<T>() and .select() properly typed? Any unsafe .data access without null checks?
- Overloaded queries: Are conditional query builders (.eq()/.in()/.or()) type-safe? Could runtime filter combinations produce invalid queries?
- Promise handling: Are async service calls properly awaited? Any fire-and-forget patterns that swallow errors?

## REACT QUERY HOOK TYPES
- Query key typing: Are query keys strongly typed or plain strings? Risk of key collisions?
- Return type safety: Do hooks properly type isLoading/data/error? Any unsafe non-null assertions on data?
- Mutation types: Are mutation input/output types aligned with the service functions they wrap?
- Enabled conditions: Are conditional queries (enabled: !!id) correctly typed to narrow the return type?
- Optimistic updates: Any optimistic update patterns that could produce type mismatches?

## ENTITY TYPE DESIGN
- Discriminated unions: Are variant types (e.g., scan types, asset categories) using proper discriminated unions?
- Optional vs nullable: Is the distinction between 'field may not be present' (optional) and 'field is present but null' (nullable) consistent?
- Branded types: Would branded types (e.g., AssetId, DepotId) prevent ID mix-ups between entities?
- Generic patterns: Are there repeated type patterns that should be generalized (e.g., WithRelations<T>, PaginatedResult<T>)?
- Circular dependencies: Any circular imports between type files?

## SHARED PACKAGE EXPORTS
- Public API surface: Is the shared package exporting everything it should? Any internal types leaking out?
- Re-export organization: Is the barrel file (index.ts) well-organized? Any deep import paths that should be re-exported?
- Type-only imports: Are type-only imports (import type) used correctly to avoid runtime import overhead?

## EDGE FUNCTION TYPES
- Request/response typing: Are edge function request bodies and responses properly typed?
- Supabase Admin client: Is the admin client typed differently from the user client? Any privilege escalation risks from shared types?

Provide specific, actionable recommendations. Reference exact type names, file paths, and line numbers. Prioritize by risk of runtime errors and developer experience impact."
)

# ── Launch agents in parallel ──

printf "Launching 2 specialist agents (expect ~3-5 minutes)...\n\n"

for i in "${!AGENT_NAMES[@]}"; do
  name="${AGENT_NAMES[$i]}"
  prompt="${AGENT_PROMPTS[$i]}"
  output_file="$OUTPUT_DIR/${name}.md"

  (
    claude -p \
      "${prompt}

Here is the complete source code to analyze:

---
${ALL_CONTENT}
---

Structure your response as:
## ${name} — Database Structure Analysis

### Critical Issues
(numbered list, most critical first — bugs, data integrity risks, security gaps, performance problems that MUST be addressed)

### Important Improvements
(numbered list — significant quality, performance, or design issues that SHOULD be addressed. Include estimated impact: high/medium/low)

### Minor Suggestions
(numbered list — small improvements for consistency, developer experience, or minor optimization)

### Architecture Assessment
(2-3 paragraph summary: overall quality rating, biggest strengths, biggest risks, and the single highest-impact recommendation)" \
      --output-format text \
      > "$output_file" 2>/dev/null
  ) &

  PIDS+=($!)
  printf "  [%d] %s\n" "$!" "$name"
done

printf "\nWaiting for all agents to complete...\n\n"

# ── Wait and collect results ──

FAILED=0
COMPLETED=0
for i in "${!PIDS[@]}"; do
  pid="${PIDS[$i]}"
  name="${AGENT_NAMES[$i]}"
  if wait "$pid"; then
    COMPLETED=$((COMPLETED + 1))
    printf "  [done %d/%d] %s\n" "$COMPLETED" "${#AGENT_NAMES[@]}" "$name"
  else
    COMPLETED=$((COMPLETED + 1))
    FAILED=$((FAILED + 1))
    printf "  [FAIL %d/%d] %s\n" "$COMPLETED" "${#AGENT_NAMES[@]}" "$name"
  fi
done

echo ""

# ── Combine output ──

TIMESTAMP=$(date '+%Y%m%d-%H%M')
mkdir -p "$SCRIPT_DIR/reviews"
REVIEW_FILE="$SCRIPT_DIR/reviews/db-review-${TIMESTAMP}.md"

{
  echo "# Database Structure Review"
  echo ""
  echo "**Date:** $(date '+%Y-%m-%d %H:%M')"
  echo "**Scope:** mobile (hooks/stores) + shared (services/types) + supabase (migrations/functions)"
  echo "**Lines analyzed:** ${TOTAL_LINES}"
  echo ""
  echo "---"
  echo ""

  for name in "${AGENT_NAMES[@]}"; do
    output_file="$OUTPUT_DIR/${name}.md"
    if [[ -f "$output_file" && -s "$output_file" ]]; then
      cat "$output_file"
    else
      echo "## ${name} — Database Structure Analysis"
      echo ""
      echo "*Agent failed or produced no output.*"
    fi
    echo ""
    echo "---"
    echo ""
  done
} > "$REVIEW_FILE"

echo "=== Database Review Complete ==="
echo ""
echo "  Agents: ${#AGENT_NAMES[@]} launched, $((${#AGENT_NAMES[@]} - FAILED)) succeeded, ${FAILED} failed"
echo "  Output: ${REVIEW_FILE}"
echo ""

# Cleanup temp dir
rm -rf "$OUTPUT_DIR"
