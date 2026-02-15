import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  showLayout?: boolean;
}

export default function PageContainer({ children, showLayout = false }: PageContainerProps) {
  // For simplified routing, just render children without layout
  // Layout can be added back if needed by setting showLayout=true
  if (!showLayout) {
    return <>{children}</>;
  }

  // Legacy layout support (not used in current simplified routing)
  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
