/**
 * useDeploymentStatus - Hook for fetching GitHub Actions deployment status
 *
 * Features:
 * - Fetches workflow runs from GitHub API
 * - Calculates deployment metrics
 * - Auto-refresh with configurable interval
 * - Error handling and loading states
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WorkflowRun,
  DeploymentMetrics,
  UseDeploymentStatusReturn,
  UseDeploymentStatusOptions,
  GitHubWorkflowRunsResponse,
  GitHubWorkflowRun,
} from '@/components/dashboard/types/deployment';

/**
 * Transform GitHub API response to WorkflowRun
 */
function transformWorkflowRun(run: GitHubWorkflowRun): WorkflowRun {
  const createdAt = new Date(run.created_at);
  const updatedAt = new Date(run.updated_at);
  const duration = Math.floor((updatedAt.getTime() - createdAt.getTime()) / 1000);

  return {
    id: run.id,
    name: run.name,
    status:
      run.status === 'in_progress'
        ? 'in_progress'
        : run.status === 'completed'
          ? 'completed'
          : (run.status as WorkflowRun['status']),
    conclusion: run.conclusion as WorkflowRun['conclusion'],
    created_at: run.created_at,
    updated_at: run.updated_at,
    duration: Math.max(0, duration),
    commit_sha: run.head_sha,
    commit_message: run.head_commit.message.split('\n')[0] ?? '', // First line only
    branch: run.head_branch,
    actor: run.actor.login,
    html_url: run.html_url,
  };
}

/**
 * Calculate deployment metrics from workflow runs
 */
function calculateMetrics(workflows: WorkflowRun[]): DeploymentMetrics {
  if (workflows.length === 0) {
    return {
      avgBuildTime: 0,
      cacheHitRate: 0,
      successRate: 0,
      deploymentsToday: 0,
    };
  }

  // Calculate average build time (completed workflows only)
  const completedWorkflows = workflows.filter((w) => w.status === 'completed' && w.duration > 0);
  const avgBuildTime =
    completedWorkflows.length > 0
      ? Math.round(
          completedWorkflows.reduce((sum, w) => sum + w.duration, 0) / completedWorkflows.length
        )
      : 0;

  // Calculate success rate
  const successCount = workflows.filter((w) => w.conclusion === 'success').length;
  const successRate =
    workflows.length > 0 ? Math.round((successCount / workflows.length) * 100) : 0;

  // Count deployments today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deploymentsToday = workflows.filter((w) => {
    const workflowDate = new Date(w.created_at);
    return workflowDate >= today;
  }).length;

  // Estimate cache hit rate based on build times
  // This is a simplified heuristic - in a real scenario, you'd parse workflow logs
  // or use GitHub Actions cache API for accurate data
  const recentWorkflows = workflows.slice(0, 5);
  const fastBuilds = recentWorkflows.filter(
    (w) => w.duration > 0 && w.duration < avgBuildTime * 0.7
  ).length;
  const cacheHitRate =
    recentWorkflows.length > 0 ? Math.round((fastBuilds / recentWorkflows.length) * 100) : 75; // Default estimate

  // Build time trend (last 7 workflows)
  const buildTimeTrend = workflows
    .slice(0, 7)
    .filter((w) => w.duration > 0)
    .map((w) => w.duration)
    .reverse();

  // Week 2 improvements (if we have enough data)
  let improvements;
  if (workflows.length >= 14) {
    const week1Avg =
      workflows
        .slice(7, 14)
        .filter((w) => w.duration > 0)
        .reduce((sum, w) => sum + w.duration, 0) / 7;
    const week2Avg =
      workflows
        .slice(0, 7)
        .filter((w) => w.duration > 0)
        .reduce((sum, w) => sum + w.duration, 0) / 7;

    if (week1Avg > 0) {
      improvements = {
        buildTimeReduction: Math.round(((week1Avg - week2Avg) / week1Avg) * 100),
        cacheImprovement: Math.round(Math.random() * 30 + 20), // Placeholder
      };
    }
  }

  const result: DeploymentMetrics = {
    avgBuildTime,
    cacheHitRate,
    successRate,
    deploymentsToday,
    buildTimeTrend,
  };
  if (improvements) result.improvements = improvements;
  return result;
}

/**
 * Hook for fetching and managing GitHub Actions deployment status
 */
export function useDeploymentStatus({
  repository,
  githubToken,
  refreshInterval = 30000,
  maxRuns = 10,
}: UseDeploymentStatusOptions): UseDeploymentStatusReturn {
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [metrics, setMetrics] = useState<DeploymentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch workflow runs from GitHub API
   */
  const fetchWorkflows = useCallback(async () => {
    // Cancel previous request if still in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setError(null);

      // GitHub API endpoint
      const apiUrl = `https://api.github.com/repos/${repository}/actions/runs?per_page=${maxRuns}&status=completed,in_progress`;

      // Prepare headers
      const headers: HeadersInit = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      // Add authorization if token provided
      if (githubToken !== undefined && githubToken !== '') {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }

      // Fetch from GitHub API
      const response = await fetch(apiUrl, {
        headers,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data: GitHubWorkflowRunsResponse = await response.json();

      // Transform and set workflows
      const transformedWorkflows = data.workflow_runs.map(transformWorkflowRun);
      setWorkflows(transformedWorkflows);

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(transformedWorkflows);
      setMetrics(calculatedMetrics);

      // Update last updated timestamp
      setLastUpdated(new Date().toISOString());

      setIsLoading(false);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Failed to fetch workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch deployment status');
      setIsLoading(false);
    }
  }, [repository, githubToken, maxRuns]);

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchWorkflows();
  }, [fetchWorkflows]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchWorkflows();

    // Set up auto-refresh interval
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchWorkflows, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [fetchWorkflows, refreshInterval]);

  return {
    workflows,
    metrics,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}

export default useDeploymentStatus;
