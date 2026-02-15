/**
 * Type definitions for GitHub Actions deployment monitoring
 */

export type WorkflowStatus = 'success' | 'failure' | 'in_progress' | 'cancelled' | 'completed';
export type WorkflowConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'neutral';
export type WorkflowFilter = 'all' | 'ci' | 'deploy-web' | 'deploy-database' | 'mobile';

/**
 * GitHub Actions workflow run data
 */
export interface WorkflowRun {
  /** Workflow run ID */
  id: number;
  /** Workflow name */
  name: string;
  /** Current status */
  status: WorkflowStatus;
  /** Final conclusion (only for completed workflows) */
  conclusion: WorkflowConclusion | null;
  /** Workflow creation timestamp */
  created_at: string;
  /** Workflow last update timestamp */
  updated_at: string;
  /** Duration in seconds */
  duration: number;
  /** Commit SHA */
  commit_sha: string;
  /** Commit message */
  commit_message: string;
  /** Branch name */
  branch: string;
  /** Actor who triggered the workflow */
  actor: string;
  /** HTML URL to the workflow run */
  html_url: string;
}

/**
 * Deployment performance metrics
 */
export interface DeploymentMetrics {
  /** Average build time in seconds */
  avgBuildTime: number;
  /** Cache hit rate percentage (0-100) */
  cacheHitRate: number;
  /** Success rate percentage (0-100) */
  successRate: number;
  /** Number of deployments today */
  deploymentsToday: number;
  /** Trend data for build times (last 7 days) */
  buildTimeTrend?: number[];
  /** Week 2 performance improvements */
  improvements?: {
    buildTimeReduction: number;
    cacheImprovement: number;
  };
}

/**
 * GitHub API workflow run response
 */
export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
  head_commit: {
    message: string;
    author: {
      name: string;
    };
  };
  actor: {
    login: string;
  };
  html_url: string;
  run_started_at?: string;
}

/**
 * GitHub API response for workflow runs
 */
export interface GitHubWorkflowRunsResponse {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
}

/**
 * Hook return type for useDeploymentStatus
 */
export interface UseDeploymentStatusReturn {
  /** List of workflow runs */
  workflows: WorkflowRun[];
  /** Calculated deployment metrics */
  metrics: DeploymentMetrics | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Last update timestamp */
  lastUpdated: string | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}

/**
 * Hook configuration options
 */
export interface UseDeploymentStatusOptions {
  /** GitHub repository (owner/repo) */
  repository: string;
  /** GitHub personal access token */
  githubToken?: string;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Maximum number of workflow runs to fetch */
  maxRuns?: number;
}
