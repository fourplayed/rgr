/**
 * DeploymentStatus - Example Usage
 *
 * This file demonstrates how to integrate the DeploymentStatus component
 * into your dashboard pages.
 */
import { DeploymentStatus } from './DeploymentStatus';

/**
 * Example 1: Basic Usage with Environment Variable
 */
export function BasicExample() {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen">
      <DeploymentStatus
        repository="fourplayed/rgr-fleet-manager"
        githubToken={import.meta.env['VITE_GITHUB_TOKEN']}
      />
    </div>
  );
}

/**
 * Example 2: Custom Refresh Interval
 */
export function CustomRefreshExample() {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen">
      <DeploymentStatus
        repository="fourplayed/rgr-fleet-manager"
        githubToken={import.meta.env['VITE_GITHUB_TOKEN']}
        refreshInterval={60000} // Refresh every 60 seconds
        maxRuns={20} // Show last 20 runs
      />
    </div>
  );
}

/**
 * Example 3: Light Theme
 */
export function LightThemeExample() {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 min-h-screen">
      <DeploymentStatus
        repository="fourplayed/rgr-fleet-manager"
        githubToken={import.meta.env['VITE_GITHUB_TOKEN']}
        isDark={false}
      />
    </div>
  );
}

/**
 * Example 4: Integrated in Dashboard Grid
 */
export function DashboardIntegrationExample() {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">DevOps Dashboard</h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main content area - Deployment Status */}
          <div className="xl:col-span-2">
            <DeploymentStatus
              repository="fourplayed/rgr-fleet-manager"
              githubToken={import.meta.env['VITE_GITHUB_TOKEN']}
            />
          </div>

          {/* Side panel - Other components */}
          <div className="space-y-6">
            {/* Add other dashboard components here */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
              {/* Quick actions content */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Without Authentication (Public Repo)
 *
 * Note: GitHub API has rate limits for unauthenticated requests (60 req/hour).
 * For production, always use a GitHub token.
 */
export function PublicRepoExample() {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen">
      <DeploymentStatus
        repository="fourplayed/rgr-fleet-manager"
        // No token - will use unauthenticated API (rate limited)
      />
    </div>
  );
}

/**
 * Example 6: Multiple Repositories
 */
export function MultiRepoExample() {
  const repositories = [
    'fourplayed/rgr-fleet-manager',
    'fourplayed/another-project',
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">Multi-Repository Monitoring</h1>

        {repositories.map((repo) => (
          <DeploymentStatus
            key={repo}
            repository={repo}
            githubToken={import.meta.env['VITE_GITHUB_TOKEN']}
            maxRuns={5}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Example 7: Responsive Layout
 */
export function ResponsiveExample() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Mobile: Full width, Desktop: Max width container */}
      <div className="container mx-auto px-4 py-6 lg:px-6">
        <DeploymentStatus
          repository="fourplayed/rgr-fleet-manager"
          githubToken={import.meta.env['VITE_GITHUB_TOKEN']}
          className="w-full"
        />
      </div>
    </div>
  );
}

/**
 * Setup Instructions:
 *
 * 1. Add GitHub Token to .env:
 *    ```
 *    VITE_GITHUB_TOKEN=ghp_your_token_here
 *    ```
 *
 * 2. Create GitHub Personal Access Token:
 *    - Go to: https://github.com/settings/tokens
 *    - Generate new token (classic)
 *    - Select scopes: `repo`, `workflow`
 *    - Copy token and add to .env
 *
 * 3. Import and use in your page:
 *    ```tsx
 *    import { DeploymentStatus } from '@/components/dashboard';
 *
 *    export default function DevOpsPage() {
 *      return (
 *        <DeploymentStatus
 *          repository="fourplayed/rgr-fleet-manager"
 *          githubToken={import.meta.env['VITE_GITHUB_TOKEN']}
 *        />
 *      );
 *    }
 *    ```
 *
 * 4. For production, consider:
 *    - Using a GitHub App instead of personal token
 *    - Implementing an Edge Function proxy to hide the token
 *    - Setting up proper CORS and security headers
 */
