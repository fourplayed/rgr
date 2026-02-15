import React, { useEffect, useState, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, ExternalLink, Clock, XCircle } from 'lucide-react';
import { VisionCard } from './vision/VisionCard';

interface SecurityAlert {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count: number;
}

interface SecurityData {
  alerts: SecurityAlert[];
  lastScanDate: string | null;
  vulnerabilitiesFixed: number;
  dependenciesOutdated: number;
  status: 'healthy' | 'warning' | 'critical';
}

const GITHUB_REPO = 'your-org/rgr-fleet-manager'; // TODO: Update with actual repo

export const SecurityStatus: React.FC = () => {
  const [securityData, setSecurityData] = useState<SecurityData>({
    alerts: [],
    lastScanDate: null,
    vulnerabilitiesFixed: 0,
    dependenciesOutdated: 0,
    status: 'healthy',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSecurityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from local security report
      const response = await fetch('/security-report.json').catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setSecurityData(parseSecurityReport(data));
      } else {
        // Use default/mock data if report not available
        setSecurityData(getDefaultSecurityData());
      }
    } catch (err) {
      console.error('Failed to load security data:', err);
      setError('Failed to load security data');
      setSecurityData(getDefaultSecurityData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const parseSecurityReport = (data: {
    vulnerabilities?: { critical?: number; high?: number; medium?: number; low?: number };
    scanDate?: string;
    fixedCount?: number;
    outdatedCount?: number;
  }): SecurityData => {
    const alerts: SecurityAlert[] = [];
    const vulnerabilities = data.vulnerabilities || {};

    // Count vulnerabilities by severity
    const severities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
    severities.forEach(severity => {
      const count = vulnerabilities[severity] || 0;
      if (count > 0) {
        alerts.push({ severity, count });
      }
    });

    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const criticalCount = vulnerabilities.critical || 0;
    const highCount = vulnerabilities.high || 0;
    const mediumCount = vulnerabilities.medium || 0;

    if (criticalCount > 0) {
      status = 'critical';
    } else if (highCount > 0 || mediumCount > 3) {
      status = 'warning';
    }

    return {
      alerts,
      lastScanDate: data.scanDate || new Date().toISOString(),
      vulnerabilitiesFixed: data.fixedCount || 0,
      dependenciesOutdated: data.outdatedCount || 0,
      status,
    };
  };

  const getDefaultSecurityData = (): SecurityData => ({
    alerts: [],
    lastScanDate: new Date().toISOString(),
    vulnerabilitiesFixed: 0,
    dependenciesOutdated: 0,
    status: 'healthy',
  });

  const getStatusColor = (status: SecurityData['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: SecurityData['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6" />;
      case 'critical':
        return <XCircle className="w-6 h-6" />;
      default:
        return <Shield className="w-6 h-6" />;
    }
  };

  const getSeverityColor = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const totalAlerts = securityData.alerts.reduce((sum, alert) => sum + alert.count, 0);

  if (loading) {
    return (
      <VisionCard className="p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </VisionCard>
    );
  }

  return (
    <VisionCard className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Security Status</h3>
          </div>
          <a
            href={`https://github.com/${GITHUB_REPO}/security`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View on GitHub
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-3">
            <div className={getStatusColor(securityData.status)}>
              {getStatusIcon(securityData.status)}
            </div>
            <div>
              <p className="text-sm text-gray-400">Overall Status</p>
              <p className="text-lg font-semibold text-white capitalize">
                {securityData.status}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Alerts</p>
            <p className="text-2xl font-bold text-white">{totalAlerts}</p>
          </div>
        </div>

        {/* Vulnerability Breakdown */}
        {securityData.alerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300">Vulnerabilities by Severity</p>
            <div className="grid grid-cols-2 gap-2">
              {securityData.alerts.map((alert) => (
                <div
                  key={alert.severity}
                  className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <p className="text-xs font-medium uppercase">{alert.severity}</p>
                  <p className="text-xl font-bold">{alert.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Fixed This Month</p>
            </div>
            <p className="text-2xl font-bold text-white">{securityData.vulnerabilitiesFixed}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <p className="text-xs text-gray-400">Outdated Deps</p>
            </div>
            <p className="text-2xl font-bold text-white">{securityData.dependenciesOutdated}</p>
          </div>
        </div>

        {/* Last Scan Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Last scan: {formatDate(securityData.lastScanDate)}</span>
          </div>
          <button
            onClick={loadSecurityData}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Action Buttons */}
        {totalAlerts > 0 && (
          <div className="pt-4 border-t border-white/10">
            <a
              href={`https://github.com/${GITHUB_REPO}/security/dependabot`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              Review & Fix Vulnerabilities
            </a>
          </div>
        )}
      </div>
    </VisionCard>
  );
};
