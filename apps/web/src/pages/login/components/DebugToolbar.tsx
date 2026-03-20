/**
 * DebugToolbar - Global debug toolbar
 * Contains console for error logging and workflow tracker.
 * Reads all state from useDevToolsStore — no props needed.
 * Rendered at the App level so it persists across route changes.
 */
import { useState, useEffect } from 'react';
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

  // Workflow state from global store
  const workflowSteps = useDevToolsStore((s) => s.workflowSteps);
  const workflowComplete = useDevToolsStore((s) => s.workflowComplete);
  const clearWorkflow = useDevToolsStore((s) => s.clearWorkflow);

  // BG gradient state
  const lightGradient = useDevToolsStore((s) => s.lightGradient);
  const darkBgGradient = useDevToolsStore((s) => s.darkBgGradient);
  const setLightGradient = useDevToolsStore((s) => s.setLightGradient);
  const setDarkBgGradient = useDevToolsStore((s) => s.setDarkBgGradient);
  const defaultLightGradient = useDevToolsStore((s) => s.defaultLightGradient);
  const defaultDarkBgGradient = useDevToolsStore((s) => s.defaultDarkBgGradient);

  // Pillar settings state
  const pillarSettings = useDevToolsStore((s) => s.pillarSettings);
  const setPillarSettings = useDevToolsStore((s) => s.setPillarSettings);
  const defaultPillarSettings = useDevToolsStore((s) => s.defaultPillarSettings);

  // Light pillar settings state
  const lightPillarSettings = useDevToolsStore((s) => s.lightPillarSettings);
  const setLightPillarSettings = useDevToolsStore((s) => s.setLightPillarSettings);
  const defaultLightPillarSettings = useDevToolsStore((s) => s.defaultLightPillarSettings);

  // Persist panel state across remounts
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('debug-toolbar-open') ?? 'false');
    } catch {
      return false;
    }
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'workflow' | 'bg'>(() => {
    try {
      const stored = localStorage.getItem('debug-toolbar-tab');
      return stored === 'console' || stored === 'workflow' || stored === 'bg' ? stored : 'console';
    } catch {
      return 'console';
    }
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
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ');

      const entry: LogEntry = {
        id: Date.now() + logIdCounter++,
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      };

      setLogs((prev) => [...prev, entry].slice(-50)); // Keep last 50 logs
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
      case 'error':
        return '#ef4444';
      case 'warn':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return textColor;
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
            onClick={() => setActiveTab('bg')}
            className="px-3 py-1 rounded text-sm font-medium transition-colors"
            style={{
              background: activeTab === 'bg' ? tabActiveBg : 'transparent',
              color: textColor,
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'bg') e.currentTarget.style.background = tabHoverBg;
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'bg') e.currentTarget.style.background = 'transparent';
            }}
          >
            BG / Pillar
          </button>
          <button
            onClick={() => {
              if (activeTab === 'workflow') clearWorkflow();
              else if (activeTab === 'bg') {
                if (isDark) {
                  setDarkBgGradient({ ...defaultDarkBgGradient });
                  setPillarSettings({ ...defaultPillarSettings });
                } else {
                  setLightGradient({ ...defaultLightGradient });
                  setLightPillarSettings({ ...defaultLightPillarSettings });
                }
              } else setLogs([]);
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
            {activeTab === 'workflow' ? 'Clear' : activeTab === 'bg' ? 'Reset' : 'Clear Logs'}
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

          {activeTab === 'bg' && (
            <div className="space-y-4 text-sm">
              {isDark ? (
                <>
                  {/* Dark BG gradient */}
                  <div>
                    <div className="font-medium mb-2" style={{ color: textColor, opacity: 0.7 }}>Dark Background</div>
                    {([
                      { label: 'Top', key: 'top', val: darkBgGradient.top },
                      { label: 'Upper Mid', key: 'upperMiddle', val: darkBgGradient.upperMiddle },
                      { label: 'Lower Mid', key: 'lowerMiddle', val: darkBgGradient.lowerMiddle },
                      { label: 'Bottom', key: 'bottom', val: darkBgGradient.bottom },
                    ] as const).map(({ label, key, val }) => (
                      <div key={key} className="flex items-center gap-2 mb-2">
                        <label className="w-14 text-xs" style={{ color: textColor }}>{label}</label>
                        <input type="color" value={val} onChange={(e) => setDarkBgGradient({ [key]: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }} />
                        <input type="text" value={val} onChange={(e) => setDarkBgGradient({ [key]: e.target.value })}
                          className="flex-1 px-2 py-1 text-xs rounded font-mono outline-none"
                          style={{ color: textColor, background: 'rgba(0,0,0,0.4)' }} />
                      </div>
                    ))}
                  </div>

                  {/* Light Pillar settings */}
                  <div>
                    <div className="font-medium mb-2" style={{ color: textColor, opacity: 0.7 }}>Light Pillar</div>
                    {([
                      { label: 'Top Color', key: 'topColor', type: 'color', val: pillarSettings.topColor },
                      { label: 'Bottom Color', key: 'bottomColor', type: 'color', val: pillarSettings.bottomColor },
                    ] as const).map(({ label, key, val }) => (
                      <div key={key} className="flex items-center gap-2 mb-2">
                        <label className="w-24 text-xs" style={{ color: textColor }}>{label}</label>
                        <input type="color" value={val} onChange={(e) => setPillarSettings({ [key]: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }} />
                        <input type="text" value={val} onChange={(e) => setPillarSettings({ [key]: e.target.value })}
                          className="flex-1 px-2 py-1 text-xs rounded font-mono outline-none"
                          style={{ color: textColor, background: 'rgba(0,0,0,0.4)' }} />
                      </div>
                    ))}
                    {([
                      { label: 'Intensity', key: 'intensity', min: 0, max: 2, step: 0.05 },
                      { label: 'Rot. Speed', key: 'rotationSpeed', min: 0, max: 1, step: 0.01 },
                      { label: 'Glow', key: 'glowAmount', min: 0, max: 0.02, step: 0.0001 },
                      { label: 'Width', key: 'pillarWidth', min: 0.5, max: 6, step: 0.1 },
                      { label: 'Height', key: 'pillarHeight', min: 0.05, max: 1, step: 0.01 },
                    ] as const).map(({ label, key, min, max, step }) => (
                      <div key={key} className="flex items-center gap-2 mb-2">
                        <label className="w-24 text-xs" style={{ color: textColor }}>{label}</label>
                        <input type="range" min={min} max={max} step={step}
                          value={pillarSettings[key] as number}
                          onChange={(e) => setPillarSettings({ [key]: parseFloat(e.target.value) })}
                          className="flex-1" />
                        <span className="w-12 text-xs text-right font-mono" style={{ color: textColor }}>
                          {(pillarSettings[key] as number).toFixed(key === 'glowAmount' ? 4 : 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Light theme controls */
                <>
                  {/* Light BG gradient */}
                  <div>
                    <div className="font-medium mb-2" style={{ color: textColor, opacity: 0.7 }}>Light Background</div>
                    {([
                      { label: 'Top', key: 'top' as const, val: lightGradient.top },
                      { label: 'Upper Mid', key: 'upperMiddle' as const, val: lightGradient.upperMiddle },
                      { label: 'Lower Mid', key: 'lowerMiddle' as const, val: lightGradient.lowerMiddle },
                      { label: 'Bottom', key: 'bottom' as const, val: lightGradient.bottom },
                    ]).map(({ label, key, val }) => (
                      <div key={key} className="flex items-center gap-2 mb-2">
                        <label className="w-20 text-xs" style={{ color: textColor }}>{label}</label>
                        <input type="color" value={val} onChange={(e) => setLightGradient({ [key]: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }} />
                        <input type="text" value={val} onChange={(e) => setLightGradient({ [key]: e.target.value })}
                          className="flex-1 px-2 py-1 text-xs rounded font-mono outline-none"
                          style={{ color: textColor, background: 'rgba(0,0,0,0.4)' }} />
                      </div>
                    ))}
                  </div>

                  {/* Light Pillar settings */}
                  <div>
                    <div className="font-medium mb-2" style={{ color: textColor, opacity: 0.7 }}>Light Pillar</div>
                    {([
                      { label: 'Top Color', key: 'topColor', type: 'color', val: lightPillarSettings.topColor },
                      { label: 'Bottom Color', key: 'bottomColor', type: 'color', val: lightPillarSettings.bottomColor },
                    ] as const).map(({ label, key, val }) => (
                      <div key={key} className="flex items-center gap-2 mb-2">
                        <label className="w-24 text-xs" style={{ color: textColor }}>{label}</label>
                        <input type="color" value={val} onChange={(e) => setLightPillarSettings({ [key]: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }} />
                        <input type="text" value={val} onChange={(e) => setLightPillarSettings({ [key]: e.target.value })}
                          className="flex-1 px-2 py-1 text-xs rounded font-mono outline-none"
                          style={{ color: textColor, background: 'rgba(0,0,0,0.4)' }} />
                      </div>
                    ))}
                    {([
                      { label: 'Intensity', key: 'intensity', min: 0, max: 2, step: 0.05 },
                      { label: 'Rot. Speed', key: 'rotationSpeed', min: 0, max: 1, step: 0.01 },
                      { label: 'Glow', key: 'glowAmount', min: 0, max: 0.02, step: 0.0001 },
                      { label: 'Width', key: 'pillarWidth', min: 0.5, max: 6, step: 0.1 },
                      { label: 'Height', key: 'pillarHeight', min: 0.05, max: 1, step: 0.01 },
                    ] as const).map(({ label, key, min, max, step }) => (
                      <div key={key} className="flex items-center gap-2 mb-2">
                        <label className="w-24 text-xs" style={{ color: textColor }}>{label}</label>
                        <input type="range" min={min} max={max} step={step}
                          value={lightPillarSettings[key] as number}
                          onChange={(e) => setLightPillarSettings({ [key]: parseFloat(e.target.value) })}
                          className="flex-1" />
                        <span className="w-12 text-xs text-right font-mono" style={{ color: textColor }}>
                          {(lightPillarSettings[key] as number).toFixed(key === 'glowAmount' ? 4 : 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium" style={{ color: textColor }}>
                          {step.label}
                        </div>
                        {step.detail && (
                          <div
                            className="text-sm mt-0.5 font-mono"
                            style={{ color: textColor, opacity: 0.6 }}
                          >
                            {step.detail}
                          </div>
                        )}
                      </div>
                      {step.timestamp && (
                        <div
                          className="text-xs font-mono"
                          style={{ color: textColor, opacity: 0.4 }}
                        >
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
