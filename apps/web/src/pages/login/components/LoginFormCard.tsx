/**
 * LoginFormCard - Login form component
 */
import { useState, useCallback } from 'react';
import { LOGIN_CONSTANTS } from '../types';
import type { LoginLogicState, LoginLogicActions } from '../useLoginLogic';
import { CARD_STYLES } from '../styles';
import { ThemedInput } from './ThemedInput';
import { LoadingSpinner } from './LoadingSpinner';
import { AnimatedSignInIcon } from './AnimatedSignInIcon';
import { useDevToolsStore, type WorkflowStep } from '@/stores/devToolsStore';
import '../login.css';

export interface LoginFormCardProps {
  state: LoginLogicState;
  actions: LoginLogicActions;
  onForgotPassword: () => void;
  isDark: boolean;
}

/**
 * Login Form Card
 */
export function LoginFormCard({
  state,
  actions,
  onForgotPassword,
  isDark,
}: LoginFormCardProps) {
  const setWorkflowSteps = useDevToolsStore((s) => s.setWorkflowSteps);
  const setWorkflowComplete = useDevToolsStore((s) => s.setWorkflowComplete);
  const { formData, status } = state;
  const { setEmail, setPassword, setRememberMe, handleSubmit } = actions;
  const isLoading = status === 'loading';
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const runWorkflow = useCallback(async () => {
    const steps: WorkflowStep[] = [];

    // Step 1: Connection
    steps.push({
      id: 'connection',
      status: 'active',
      label: 'Establishing connection',
      detail: 'Connecting to Supabase...',
      timestamp: new Date().toISOString(),
    });
    setWorkflowSteps([...steps]);
    await sleep(800);

    steps[0] = {
      ...steps[0]!,
      status: 'success',
      detail: 'Connected to eryhwfkqbbuftepjvgwq.supabase.co',
      timestamp: new Date().toISOString(),
    };
    setWorkflowSteps([...steps]);

    // Step 2: Authentication
    steps.push({
      id: 'auth',
      status: 'active',
      label: 'Authenticating user',
      detail: 'Verifying credentials...',
      timestamp: new Date().toISOString(),
    });
    setWorkflowSteps([...steps]);
    await sleep(1000);

    steps[1] = {
      ...steps[1]!,
      status: 'success',
      detail: 'User authenticated successfully',
      timestamp: new Date().toISOString(),
    };
    setWorkflowSteps([...steps]);

    // Step 3: Session
    steps.push({
      id: 'session',
      status: 'active',
      label: 'Creating session',
      detail: 'Generating JWT token...',
      timestamp: new Date().toISOString(),
    });
    setWorkflowSteps([...steps]);
    await sleep(600);

    steps[2] = {
      ...steps[2]!,
      status: 'success',
      detail: 'Session created with 7-day expiry',
      timestamp: new Date().toISOString(),
    };
    setWorkflowSteps([...steps]);

    // Step 4: Profile
    steps.push({
      id: 'profile',
      status: 'active',
      label: 'Loading user profile',
      detail: 'SELECT * FROM profiles WHERE user_id = ...',
      timestamp: new Date().toISOString(),
    });
    setWorkflowSteps([...steps]);
    await sleep(500);

    steps[3] = {
      ...steps[3]!,
      status: 'success',
      detail: 'Profile data loaded',
      timestamp: new Date().toISOString(),
    };
    setWorkflowSteps([...steps]);

    // Step 5: Permissions
    steps.push({
      id: 'permissions',
      status: 'active',
      label: 'Checking permissions',
      detail: 'Verifying role-based access...',
      timestamp: new Date().toISOString(),
    });
    setWorkflowSteps([...steps]);
    await sleep(400);

    steps[4] = {
      ...steps[4]!,
      status: 'success',
      detail: 'Permissions validated',
      timestamp: new Date().toISOString(),
    };
    setWorkflowSteps([...steps]);

    // Step 6: Sync
    steps.push({
      id: 'sync',
      status: 'active',
      label: 'Syncing application data',
      detail: 'Loading fleet assets and recent scans...',
      timestamp: new Date().toISOString(),
    });
    setWorkflowSteps([...steps]);
    await sleep(700);

    steps[5] = {
      ...steps[5]!,
      status: 'success',
      detail: 'Data synchronized',
      timestamp: new Date().toISOString(),
    };
    setWorkflowSteps([...steps]);

    // Signal that the workflow is complete so the "Authentication Complete!" banner shows
    setWorkflowComplete(true);
  }, [setWorkflowSteps, setWorkflowComplete]);

  // Handle form submission with workflow
  // The workflow runs purely as a visual animation in the dev-tools panel.
  // handleSubmit is called but we let the workflow complete independently --
  // navigation or errors from handleSubmit must NOT clear the workflow steps.
  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Only start workflow if credentials are provided
      if (!formData.email || !formData.password) {
        handleSubmit(e);
        return;
      }

      // Start workflow animation (runs independently, ~4 seconds)
      runWorkflow();

      // Kick off the actual login (may succeed/fail before workflow finishes)
      handleSubmit(e);
    },
    [handleSubmit, runWorkflow, formData.email, formData.password]
  );

  const textColor = isDark ? 'text-slate-200' : 'text-white';
  const linkColor = 'text-white/90 hover:text-white';

  return (
    <div style={isDark ? CARD_STYLES.dark : CARD_STYLES.light}>
      <form
        id="login-form"
        onSubmit={handleFormSubmit}
        aria-label={LOGIN_CONSTANTS.UI.FORM_LABEL}
        className="flex flex-col gap-4"
        style={{ minHeight: '200px', marginTop: '15px' }}
        noValidate
      >
        {isLoading && (
          <div className="sr-only" aria-live="assertive" role="status">
            {LOGIN_CONSTANTS.UI.LOADING_TEXT}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <ThemedInput
            id="login-email"
            name="email"
            label="EMAIL"
            type="email"
            autoComplete="email"
            autoFocus
            required
            isDark={isDark}
            value={formData.email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />

          <ThemedInput
            id="login-password"
            name="password"
            label="PASSWORD"
            type="password"
            autoComplete="current-password"
            required
            isDark={isDark}
            value={formData.password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 border-gray-300 rounded cursor-pointer"
              style={{
                accentColor: isDark ? '#1e3a8a' : '#0000CC',
              }}
              aria-label={LOGIN_CONSTANTS.UI.REMEMBER_ME_LABEL}
            />
            <label htmlFor="remember-me" className={`ml-2 block text-sm ${textColor}`}>
              {LOGIN_CONSTANTS.UI.REMEMBER_ME_LABEL}
            </label>
          </div>

          <button
            type="button"
            onClick={onForgotPassword}
            className={`text-sm font-medium ${linkColor} bg-transparent border-none cursor-pointer transition-colors`}
            aria-label={LOGIN_CONSTANTS.UI.FORGOT_PASSWORD_LABEL}
          >
            {LOGIN_CONSTANTS.UI.FORGOT_PASSWORD_LABEL}
          </button>
        </div>
      </form>

      {/* Sign In button */}
      <div className="mt-6">
        <button
          type="submit"
          form="login-form"
          disabled={isLoading}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          className={`
            chrome-button ${isDark ? 'chrome-button-dark' : 'chrome-button-light'}
            group w-full py-2 px-4 rounded-lg text-base text-white
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-y-75'}
            transition-all duration-300 ease-in-out
          `}
        >
          <span className="chrome-button-content">
            <span className="chrome-button-text">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <LoadingSpinner />
                  {LOGIN_CONSTANTS.UI.LOADING_TEXT}
                </span>
              ) : (
                <>
                  {LOGIN_CONSTANTS.UI.SUBMIT_BUTTON_TEXT}
                  <AnimatedSignInIcon isHovered={isButtonHovered} size={24} />
                </>
              )}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
