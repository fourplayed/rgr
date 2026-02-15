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
import Button from '@/components/ui/Button';
import { useLoginLogic } from './login/useLoginLogic';
import { LoginPresenter } from './login/LoginPresenter';

/**
 * Main Login page component
 * Wires together logic hook + presenter + real UI components
 */
export default function Login() {
  const { state, actions } = useLoginLogic();

  return (
    <LoginPresenter
      state={state}
      actions={actions}
      ButtonComponent={Button}
    />
  );
}
