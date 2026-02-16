/**
 * StubPage - Reusable placeholder page for unimplemented routes
 *
 * Renders the full dashboard layout (animated background + top nav)
 * with a "Coming Soon" placeholder in the content area.
 */
import { useDashboardLogic } from './dashboard/useDashboardLogic';
import { DashboardPresenter } from './dashboard/DashboardPresenter';
import { CONTENT_PANEL_STYLES } from './dashboard/styles';

interface StubPageProps {
  title: string;
}

export default function StubPage({ title }: StubPageProps) {
  const { state, actions } = useDashboardLogic();
  const panelStyle = state.isDark ? CONTENT_PANEL_STYLES.dark : CONTENT_PANEL_STYLES.light;

  return (
    <DashboardPresenter state={state} actions={actions}>
      <div className="p-8" style={panelStyle}>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: state.isDark ? '#f8fafc' : '#ffffff' }}
        >
          {title}
        </h1>
        <p
          className="text-base"
          style={{ color: state.isDark ? 'rgba(148, 163, 184, 0.9)' : 'rgba(255, 255, 255, 0.8)' }}
        >
          Coming soon. This section is under development.
        </p>
      </div>
    </DashboardPresenter>
  );
}
