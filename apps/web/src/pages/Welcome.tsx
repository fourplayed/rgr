/**
 * Welcome page - Container component
 *
 * ARCHITECTURE: Container/Presenter + Dependency Injection
 * Thin wrapper that connects useWelcomeLogic with WelcomePresenter.
 */
import { useWelcomeLogic } from './welcome/useWelcomeLogic';
import { WelcomePresenter } from './welcome/WelcomePresenter';

export default function Welcome() {
  const { state, actions } = useWelcomeLogic();

  return <WelcomePresenter state={state} actions={actions} />;
}
