/**
 * WorkflowLog - Real-time authentication workflow logger
 * Displays connection status, queries, and progress during sign-in
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface WorkflowStep {
  id: string;
  status: 'pending' | 'active' | 'success' | 'error';
  label: string;
  detail?: string;
  timestamp?: string;
}

interface WorkflowLogProps {
  isVisible: boolean;
  isDark: boolean;
  onComplete?: () => void;
}

export function WorkflowLog({
  isVisible,
  isDark: _isDark,
  onComplete,
}: WorkflowLogProps): JSX.Element | null {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const addStep = useCallback((step: WorkflowStep): void => {
    setSteps((prev) => [...prev, { ...step, timestamp: new Date().toISOString() }]);
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<Omit<WorkflowStep, 'id'>>): void => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, ...updates, timestamp: new Date().toISOString() } : step
      )
    );
  }, []);

  const sleep = useCallback(
    (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
    []
  );

  useEffect(() => {
    if (!isVisible) {
      setSteps([]);
      setIsComplete(false);
      return;
    }

    let cancelled = false;

    // Simulate authentication workflow
    const workflow = async () => {
      // Step 1: Connection
      if (cancelled) return;
      addStep({
        id: 'connection',
        status: 'active',
        label: 'Establishing connection',
        detail: 'Connecting to Supabase...',
      });
      await sleep(800);
      if (cancelled) return;
      updateStep('connection', {
        status: 'success',
        detail: 'Connected to eryhwfkqbbuftepjvgwq.supabase.co',
      });

      // Step 2: Authentication
      if (cancelled) return;
      addStep({
        id: 'auth',
        status: 'active',
        label: 'Authenticating user',
        detail: 'Verifying credentials...',
      });
      await sleep(1000);
      if (cancelled) return;
      updateStep('auth', {
        status: 'success',
        detail: 'User authenticated successfully',
      });

      // Step 3: Session
      if (cancelled) return;
      addStep({
        id: 'session',
        status: 'active',
        label: 'Creating session',
        detail: 'Generating JWT token...',
      });
      await sleep(600);
      if (cancelled) return;
      updateStep('session', {
        status: 'success',
        detail: 'Session created with 7-day expiry',
      });

      // Step 4: Profile
      if (cancelled) return;
      addStep({
        id: 'profile',
        status: 'active',
        label: 'Loading user profile',
        detail: 'SELECT * FROM profiles WHERE user_id = ...',
      });
      await sleep(500);
      if (cancelled) return;
      updateStep('profile', {
        status: 'success',
        detail: 'Profile data loaded',
      });

      // Step 5: Permissions
      if (cancelled) return;
      addStep({
        id: 'permissions',
        status: 'active',
        label: 'Checking permissions',
        detail: 'Verifying role-based access...',
      });
      await sleep(400);
      if (cancelled) return;
      updateStep('permissions', {
        status: 'success',
        detail: 'Permissions validated',
      });

      // Step 6: Sync
      if (cancelled) return;
      addStep({
        id: 'sync',
        status: 'active',
        label: 'Syncing application data',
        detail: 'Loading fleet assets and recent scans...',
      });
      await sleep(700);
      if (cancelled) return;
      updateStep('sync', {
        status: 'success',
        detail: 'Data synchronized',
      });

      // Complete
      if (cancelled) return;
      await sleep(300);
      if (cancelled) return;
      setIsComplete(true);
      await sleep(1500);
      if (cancelled) return;
      onComplete?.();
    };

    workflow();

    return () => {
      cancelled = true;
    };
  }, [isVisible, onComplete, addStep, updateStep, sleep]);

  // Handle Escape key to dismiss when complete
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible && isComplete) {
        onComplete?.();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, isComplete, onComplete]);

  const styles = useMemo(() => {
    // Glassmorphic styling matching dev-tools
    const bgColor = 'rgba(55, 65, 81, 0.3)';
    const borderColor = 'rgba(255, 255, 255, 0.2)';
    const textColor = '#ffffff';
    const successColor = '#10b981';
    const activeColor = '#60a5fa';

    return {
      container: {
        background: bgColor,
        borderColor: borderColor,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
      border: { borderColor },
      text: { color: textColor },
      textMuted: { color: textColor, opacity: 0.7 },
      textSubtle: { color: textColor, opacity: 0.6 },
      textFaint: { color: textColor, opacity: 0.4 },
      successColor,
      activeColor,
    };
  }, []);

  if (!isVisible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-title"
      aria-describedby="workflow-description"
      className="fixed bottom-0 right-0 z-40 border-t border-l rounded-tl-xl shadow-2xl overflow-hidden transition-transform duration-500 ease-out"
      style={{
        ...styles.container,
        width: '500px',
        maxHeight: '80vh',
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      <div className="flex flex-col" style={{ minHeight: '200px' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b" style={styles.border}>
          <h2 id="workflow-title" className="text-xl font-bold" style={styles.text}>
            {isComplete ? '✓ Authentication Complete' : '⚡ Authentication Workflow'}
          </h2>
          <p id="workflow-description" className="text-sm mt-1" style={styles.textMuted}>
            {isComplete ? 'Redirecting to dashboard...' : 'Processing your sign-in request'}
          </p>
        </div>

        {/* Live region for screen readers */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {steps[steps.length - 1]?.label}
        </div>

        {/* Workflow Steps */}
        <div className="px-6 py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3 transition-all duration-300">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-1">
                {step.status === 'success' && (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={styles.successColor}
                    aria-label="Completed"
                  >
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
                    style={{ borderColor: styles.activeColor }}
                    aria-label="In progress"
                  />
                )}
                {step.status === 'pending' && (
                  <div
                    className="w-5 h-5 rounded-full border-2"
                    style={styles.border}
                    aria-label="Pending"
                  />
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={styles.text}>
                  {step.label}
                </div>
                {step.detail && (
                  <div className="text-sm mt-0.5 font-mono" style={styles.textSubtle}>
                    {step.detail}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              {step.timestamp && (
                <div className="text-xs font-mono" style={styles.textFaint}>
                  {new Date(step.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Success Message */}
        {isComplete && (
          <div className="px-6 py-4 border-t" style={styles.border}>
            <div className="text-center text-lg font-bold" style={{ color: styles.successColor }}>
              ✓ Success! Workflow Complete!
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
