/**
 * DeploymentStatus - GitHub Actions deployment monitoring dashboard
 *
 * Features:
 * - Real-time GitHub Actions workflow status
 * - Timeline view of last 10 deployments
 * - Performance metrics (build time trends, cache hit rate)
 * - Auto-refresh every 30 seconds
 * - Vision UI glassmorphism design
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  GitBranch,
  GitCommit,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Filter,
  Zap,
  Minus,
} from 'lucide-react';
import { VisionCard } from './vision/VisionCard';
import { Badge } from '@/components/ui/Badge';
import { useDeploymentStatus } from '@/hooks/useDeploymentStatus';
import type { WorkflowRun, WorkflowFilter } from './types/deployment';

export interface DeploymentStatusProps {
  /** GitHub repository owner/name (e.g., "fourplayed/rgr-fleet-manager") */
  repository: string;
  /** GitHub personal access token */
  githubToken?: string;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Maximum number of workflow runs to display */
  maxRuns?: number;
  /** Optional CSS class name */
  className?: string;
  /** Dark mode flag */
  isDark?: boolean;
}

export const DeploymentStatus = React.memo<DeploymentStatusProps>(
  ({
    repository,
    githubToken,
    refreshInterval = 30000,
    maxRuns = 10,
    className = '',
    isDark = true,
  }) => {
    const [selectedFilter, setSelectedFilter] = useState<WorkflowFilter>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { workflows, metrics, isLoading, error, lastUpdated, refetch } = useDeploymentStatus({
      repository,
      ...(githubToken !== undefined ? { githubToken } : {}),
      refreshInterval,
      maxRuns,
    });

    // Manual refresh handler
    const handleRefresh = useCallback(async () => {
      setIsRefreshing(true);
      await refetch();
      setTimeout(() => setIsRefreshing(false), 500);
    }, [refetch]);

    // Filter workflows by type
    const filteredWorkflows = useMemo(() => {
      if (selectedFilter === 'all') return workflows;
      return workflows.filter((w) => {
        const name = w.name.toLowerCase();
        if (selectedFilter === 'ci') return name.includes('ci');
        if (selectedFilter === 'deploy-web') return name.includes('web');
        if (selectedFilter === 'deploy-database')
          return name.includes('database') || name.includes('db');
        if (selectedFilter === 'mobile') return name.includes('mobile');
        return true;
      });
    }, [workflows, selectedFilter]);

    // Status badge helper
    const getStatusBadge = (status: WorkflowRun['status'], conclusion?: string) => {
      if (status === 'in_progress') {
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Running</span>
          </Badge>
        );
      }

      if (status === 'completed') {
        if (conclusion === 'success') {
          return (
            <Badge
              variant="outline"
              className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Success</span>
            </Badge>
          );
        }
        if (conclusion === 'failure') {
          return (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300"
            >
              <XCircle className="w-3 h-3" />
              <span>Failed</span>
            </Badge>
          );
        }
      }

      if (status === 'cancelled') {
        return (
          <Badge
            variant="default"
            className="flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-300"
          >
            <Minus className="w-3 h-3" />
            <span>Cancelled</span>
          </Badge>
        );
      }

      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300"
        >
          <AlertCircle className="w-3 h-3" />
          <span>{status}</span>
        </Badge>
      );
    };

    // Format duration
    const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    // Format time ago
    const formatTimeAgo = (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    };

    if (error) {
      return (
        <VisionCard className={className} isDark={isDark}>
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Failed to load deployment status</p>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        </VisionCard>
      );
    }

    return (
      <VisionCard className={className} isDark={isDark} noPadding>
        {/* Header */}
        <div
          className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Deployment Status
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {lastUpdated ? `Updated ${formatTimeAgo(lastUpdated)}` : 'Loading...'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className={`
            p-2 rounded-lg transition-all duration-200
            ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-900/10'}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
            title="Refresh status"
          >
            <RefreshCw
              className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-700'} ${isLoading || isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Metrics Grid */}
        {metrics && (
          <div
            className={`grid grid-cols-4 gap-4 p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'}`}
          >
            {/* Average Build Time */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-900/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <span
                  className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Avg Build Time
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatDuration(metrics.avgBuildTime)}
                </span>
              </div>
            </div>

            {/* Cache Hit Rate */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-900/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span
                  className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Cache Hit Rate
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {metrics.cacheHitRate}%
                </span>
              </div>
            </div>

            {/* Success Rate */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-900/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2
                  className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                />
                <span
                  className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Success Rate
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {metrics.successRate}%
                </span>
              </div>
            </div>

            {/* Deployments Today */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-900/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                <span
                  className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Today
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {metrics.deploymentsToday}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div
          className={`flex items-center gap-2 p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'}`}
        >
          <Filter className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
          <div className="flex gap-2">
            {(['all', 'ci', 'deploy-web', 'deploy-database', 'mobile'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${
                  selectedFilter === filter
                    ? isDark
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                    : isDark
                      ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
              >
                {filter === 'all'
                  ? 'All'
                  : filter
                      .split('-')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Timeline */}
        <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
          {isLoading && workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2
                className={`w-8 h-8 animate-spin ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              />
              <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Loading deployments...
              </p>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity
                className={`w-8 h-8 ${isDark ? 'text-slate-400' : 'text-slate-600'} opacity-50`}
              />
              <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                No deployments found
              </p>
            </div>
          ) : (
            filteredWorkflows.map((workflow, index) => (
              <a
                key={workflow.id}
                href={`https://github.com/${repository}/actions/runs/${workflow.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                block p-4 rounded-xl
                transition-all duration-200
                ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'}
                border ${isDark ? 'border-white/10' : 'border-slate-200'}
                group
              `}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Timeline + Content */}
                  <div className="flex gap-4 flex-1 min-w-0">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className={`
                      w-3 h-3 rounded-full flex-shrink-0
                      ${
                        workflow.status === 'completed' && workflow.conclusion === 'success'
                          ? 'bg-emerald-500'
                          : workflow.status === 'completed' && workflow.conclusion === 'failure'
                            ? 'bg-rose-500'
                            : workflow.status === 'in_progress'
                              ? 'bg-blue-500 animate-pulse'
                              : 'bg-slate-500'
                      }
                    `}
                      />
                      {index < filteredWorkflows.length - 1 && (
                        <div
                          className={`w-0.5 h-full min-h-[60px] mt-2 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}
                          >
                            {workflow.name}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(workflow.status, workflow.conclusion ?? undefined)}
                            <span
                              className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                            >
                              {formatTimeAgo(workflow.created_at)}
                            </span>
                          </div>
                        </div>

                        <ExternalLink
                          className={`w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                        />
                      </div>

                      {/* Metadata */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <GitBranch
                            className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                          />
                          <span
                            className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            {workflow.branch}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <GitCommit
                            className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                          />
                          <span
                            className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            {workflow.commit_sha.substring(0, 7)}
                          </span>
                          <span
                            className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} truncate`}
                          >
                            {workflow.commit_message}
                          </span>
                        </div>

                        {workflow.duration > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock
                              className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                            />
                            <span
                              className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                            >
                              Duration: {formatDuration(workflow.duration)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs">
                          <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            by {workflow.actor}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </VisionCard>
    );
  }
);

DeploymentStatus.displayName = 'DeploymentStatus';

export default DeploymentStatus;
