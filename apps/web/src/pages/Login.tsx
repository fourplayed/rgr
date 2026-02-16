/**
 * Login page - Container component
 *
 * ARCHITECTURE: Container/Presenter + Dependency Injection
 * - This is a thin wrapper that connects logic with UI
 * - Injects real UI components (only loaded here)
 * - Logic and UI are tested separately
 *
 * REFACTORED: InputComponent no longer needed - inputs are now internal to LoginFormCard
 */
import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { useLoginLogic } from './login/useLoginLogic';
import { LoginPresenter } from './login/LoginPresenter';

/**
 * Main Login page component
 * Wires together logic hook + presenter + real UI components
 *
 * Navigation is deferred so the workflow log in the dev-tools panel can
 * finish rendering before the page unmounts.  The presenter signals
 * readiness via `onNavigationReady`.
 */
export default function Login() {
  const realNavigate = useNavigate();

  // Ref that stores a pending navigation target.  The presenter will call
  // `onNavigationReady` once the exit animation finishes, at which point
  // we execute the deferred navigate.
  const pendingNavRef = useRef<{ path: string; options?: { replace?: boolean; state?: unknown } } | null>(null);

  // Deferred navigate: stash the path + options instead of navigating immediately
  const deferredNavigate = useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === 'string') {
        pendingNavRef.current = { path: to, options };
      } else {
        // Numeric (history go) -- pass through immediately
        realNavigate(to);
      }
    },
    [realNavigate],
  );

  // Called by the presenter once the exit slide animation finishes.
  // Flushes any pending navigation.
  const handleNavigationReady = useCallback(() => {
    if (pendingNavRef.current !== null) {
      const { path, options } = pendingNavRef.current;
      pendingNavRef.current = null;
      realNavigate(path, options);
    }
  }, [realNavigate]);

  const { state, actions } = useLoginLogic({
    navigate: deferredNavigate as ReturnType<typeof useNavigate>,
  });

  return (
    <LoginPresenter
      state={state}
      actions={actions}
      ButtonComponent={Button}
      onNavigationReady={handleNavigationReady}
    />
  );
}
