/**
 * DebugToolbar - Global debug toolbar
 * Contains console for error logging and gradient customizer.
 * Reads all state from useDevToolsStore — no props needed.
 * Rendered at the App level so it persists across route changes.
 */
import { useState, useEffect } from 'react';
import { GradientColorPicker } from './GradientColorPicker';
import { useDevToolsStore } from '@/stores/devToolsStore';
import { useTheme } from '@/hooks/useTheme';

// Re-export for backward compatibility
export type { WorkflowStep } from '@/stores/devToolsStore';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'error' | 'warn' | 'info' | 'log';
  message: string;
}

export function DebugToolbar() {
  const { isDark } = useTheme();

  // Gradient state from global store
  const lightGradient = useDevToolsStore((s) => s.lightGradient);
  const darkGradient = useDevToolsStore((s) => s.darkGradient);
  const setLightGradient = useDevToolsStore((s) => s.setLightGradient);
  const setDarkGradient = useDevToolsStore((s) => s.setDarkGradient);
  const defaultLightGradient = useDevToolsStore((s) => s.defaultLightGradient);
  const defaultDarkGradient = useDevToolsStore((s) => s.defaultDarkGradient);

  // Workflow state from global store
  const workflowSteps = useDevToolsStore((s) => s.workflowSteps);
  const workflowComplete = useDevToolsStore((s) => s.workflowComplete);
  const clearWorkflow = useDevToolsStore((s) => s.clearWorkflow);

  const gradient = isDark ? darkGradient : lightGradient;
  const setGradient = isDark ? setDarkGradient : setLightGradient;
  const defaults = isDark ? defaultDarkGradient : defaultLightGradient;

  // Persist panel state across remounts
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('debug-toolbar-open');
    return stored ? JSON.parse(stored) : false;
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'gradient' | 'workflow'>(() => {
    const stored = localStorage.getItem('debug-toolbar-tab');
    return (stored === 'console' || stored === 'gradient' || stored === 'workflow') ? stored : 'console';
  });

  // Persist panel state to localStorage so it doesn't auto-close
  useEffect(() => {
    localStorage.setItem('debug-toolbar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('debug-toolbar-tab', activeTab);
  }, [activeTab]);

  // Intercept console methods to capture logs
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    const originalInfo = console.info;
    let logIdCounter = 0;

    const addLog = (type: LogEntry['type'], args: unknown[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      const entry: LogEntry = {
        id: Date.now() + logIdCounter++,
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      };

      setLogs(prev => [...prev, entry].slice(-50)); // Keep last 50 logs
    };

    console.error = (...args: unknown[]) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args: unknown[]) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.log = (...args: unknown[]) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.info = (...args: unknown[]) => {
      originalInfo(...args);
      addLog('info', args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      console.info = originalInfo;
    };
  }, []);

  const toolbarBg = 'rgba(55, 65, 81, 0.3)';
  const toolbarBorder = 'rgba(255, 255, 255, 0.2)';
  const textColor = '#ffffff';
  const tabActiveBg = 'rgba(255, 255, 255, 0.2)';
  const tabHoverBg = 'rgba(255, 255, 255, 0.1)';

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return textColor;
    }
  };

  return (
    <>
      {/* Toggle button - glassmorphic tab style attached to bottom left - hidden when panel is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-0 left-4 z-50 px-4 py-2 rounded-t-lg text-sm font-medium transition-all duration-300 shadow-lg hover:translate-y-[-4px] hover:shadow-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderBottom: 'none',
            color: '#ffffff',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          Dev. Tools
        </button>
      )}

      {/* Toolbar panel - slides out from left */}
      <div
        className="fixed bottom-0 left-0 z-40 border-t border-r rounded-tr-xl transition-transform duration-500 ease-out"
        style={{
          background: toolbarBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: toolbarBorder,
          height: '450px',
          width: 'calc(28% + 200px)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
          {/* Header with tabs */}
          <div
            className="flex items-center gap-2 px-4 py-2 border-b"
            style={{ borderColor: toolbarBorder }}
          >
            <button
              onClick={() => setActiveTab('console')}
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{
                background: activeTab === 'console' ? tabActiveBg : 'transparent',
                color: textColor,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'console') {
                  e.currentTarget.style.background = tabHoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'console') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Console ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('gradient')}
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{
                background: activeTab === 'gradient' ? tabActiveBg : 'transparent',
                color: textColor,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'gradient') {
                  e.currentTarget.style.background = tabHoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'gradient') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              BG Gradient
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{
                background: activeTab === 'workflow' ? tabActiveBg : 'transparent',
                color: textColor,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'workflow') {
                  e.currentTarget.style.background = tabHoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'workflow') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Workflow {workflowSteps.length > 0 && `(${workflowSteps.length})`}
            </button>
            <button
              onClick={() => {
                if (activeTab === 'workflow') clearWorkflow();
                else setLogs([]);
              }}
              className="ml-auto px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{
                background: 'transparent',
                color: textColor,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = tabHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Clear Logs
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{
                background: 'transparent',
                color: textColor,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = tabHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ✕
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'console' && (
              <div className="space-y-1 font-mono text-sm">
                {logs.length === 0 ? (
                  <div style={{ color: textColor, opacity: 0.5 }}>
                    No logs yet. Console output will appear here.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-3 py-1 px-2 rounded hover:bg-opacity-10"
                      style={{
                        borderLeft: `3px solid ${getLogColor(log.type)}`,
                      }}
                    >
                      <span style={{ color: textColor, opacity: 0.7, minWidth: '80px' }}>
                        {log.timestamp}
                      </span>
                      <span
                        style={{ color: getLogColor(log.type), minWidth: '60px', fontWeight: 'bold' }}
                      >
                        [{log.type.toUpperCase()}]
                      </span>
                      <span style={{ color: textColor, flex: 1, whiteSpace: 'pre-wrap' }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'gradient' && (
              <div className="flex justify-center">
                <GradientColorPicker
                  topColor={gradient.top}
                  upperMiddleColor={gradient.upperMiddle}
                  lowerMiddleColor={gradient.lowerMiddle}
                  bottomColor={gradient.bottom}
                  onTopColorChange={(c) => setGradient({ top: c })}
                  onUpperMiddleColorChange={(c) => setGradient({ upperMiddle: c })}
                  onLowerMiddleColorChange={(c) => setGradient({ lowerMiddle: c })}
                  onBottomColorChange={(c) => setGradient({ bottom: c })}
                  isDark={isDark}
                  defaultColors={defaults}
                />
              </div>
            )}

            {activeTab === 'workflow' && (
              <div className="space-y-3 font-mono text-sm">
                {workflowSteps.length === 0 ? (
                  <div style={{ color: textColor, opacity: 0.5 }}>
                    No workflow activity yet. Sign in to start authentication workflow.
                  </div>
                ) : (
                  <>
                    {workflowComplete && (
                      <div
                        className="px-4 py-3 rounded-lg text-center text-lg font-bold mb-3"
                        style={{
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        Authentication Complete!
                      </div>
                    )}
                    {workflowSteps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-3 px-3 py-2 rounded-lg transition-all duration-300"
                        style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {step.status === 'success' && (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#10b981">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {step.status === 'active' && (
                            <div
                              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                              style={{ borderColor: '#60a5fa' }}
                            />
                          )}
                          {step.status === 'pending' && (
                            <div
                              className="w-5 h-5 rounded-full border-2"
                              style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                            />
                          )}
                          {step.status === 'error' && (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#ef4444">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium" style={{ color: textColor }}>
                            {step.label}
                          </div>
                          {step.detail && (
                            <div className="text-sm mt-0.5 font-mono" style={{ color: textColor, opacity: 0.6 }}>
                              {step.detail}
                            </div>
                          )}
                        </div>
                        {step.timestamp && (
                          <div className="text-xs font-mono" style={{ color: textColor, opacity: 0.4 }}>
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </div>
        </div>
    </>
  );
}
