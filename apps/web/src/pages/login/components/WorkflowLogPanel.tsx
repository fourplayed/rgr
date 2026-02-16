/**
 * WorkflowLogPanel - Slide-out panel for authentication workflow log
 * Slides in from the right at the bottom of the screen.
 * Reads all state from useDevToolsStore — no props needed.
 * Rendered at the App level so it persists across route changes.
 */
import { useState, useEffect } from 'react';
import { useDevToolsStore } from '@/stores/devToolsStore';

const textColor = '#ffffff';
const panelBg = 'rgba(55, 65, 81, 0.3)';
const borderColor = 'rgba(255, 255, 255, 0.2)';

export function WorkflowLogPanel() {
  const workflowSteps = useDevToolsStore((s) => s.workflowSteps);
  const workflowComplete = useDevToolsStore((s) => s.workflowComplete);
  const clearWorkflow = useDevToolsStore((s) => s.clearWorkflow);

  const [isOpen, setIsOpen] = useState(false);

  // Auto-open when workflow steps arrive
  useEffect(() => {
    if (workflowSteps.length > 0) {
      setIsOpen(true);
    }
  }, [workflowSteps]);

  return (
    <>
      {/* Toggle button - bottom right, hidden when open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-0 right-4 z-50 px-4 py-2 rounded-t-lg text-sm font-medium transition-all duration-300 shadow-lg hover:translate-y-[-4px] hover:shadow-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${borderColor}`,
            borderBottom: 'none',
            color: textColor,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          Workflow Log {workflowSteps.length > 0 && `(${workflowSteps.length})`}
        </button>
      )}

      {/* Slide-out panel - bottom right */}
      <div
        className="fixed bottom-0 right-0 z-40 border-t border-l rounded-tl-xl transition-transform duration-500 ease-out"
        style={{
          background: panelBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor,
          height: '800px',
          width: '420px',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor }}
        >
          <span className="text-sm font-medium" style={{ color: textColor }}>
            Workflow Log ({workflowSteps.length})
          </span>
          <div className="flex gap-2">
            <button
              onClick={clearWorkflow}
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{ background: 'transparent', color: textColor }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{ background: 'transparent', color: textColor }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Workflow steps */}
        <div className="flex-1 overflow-auto p-4 space-y-3 font-mono text-sm">
          {workflowSteps.length === 0 ? (
            <div style={{ color: textColor, opacity: 0.5 }}>
              No workflow activity yet. Click "Sign In" to start authentication workflow.
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
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {step.status === 'success' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#10b981" aria-label="Completed">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {step.status === 'active' && (
                      <div
                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: '#60a5fa' }}
                        aria-label="In progress"
                      />
                    )}
                    {step.status === 'pending' && (
                      <div
                        className="w-5 h-5 rounded-full border-2"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                        aria-label="Pending"
                      />
                    )}
                    {step.status === 'error' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#ef4444" aria-label="Error">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  {/* Step Info */}
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

                  {/* Timestamp */}
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
      </div>
    </>
  );
}
