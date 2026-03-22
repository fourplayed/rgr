import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeSupabase } from './config/supabase';
import { useAuthStore } from './stores/authStore';
import { hasRoleLevel, onAuthStateChange } from '@rgr/shared';
import type { UserRole } from '@rgr/shared';
import { DebugToolbar } from './pages/login/components/DebugToolbar';
import { AppShell } from './components/shell/AppShell';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assets = lazy(() => import('./pages/Assets'));
const Reports = lazy(() => import('./pages/Reports'));
const StubPage = lazy(() => import('./pages/StubPage'));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Protected Route wrapper - redirects to login if not authenticated
 */
function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: UserRole;
}) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!user?.role || !hasRoleLevel(user.role, requiredRole))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  // useState (not useMemo) ensures QueryClient survives React fast-refresh
  const [queryClient] = useState(() => createQueryClient());
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;

    // Initialize Supabase client and check auth status
    async function initialize() {
      try {
        initializeSupabase();
        await checkAuth();

        // Subscribe to auth state changes
        unsubscribeAuth = onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            useAuthStore.setState({ user: null, isAuthenticated: false, error: null });
            queryClient.clear();
          } else if (event === 'TOKEN_REFRESHED') {
            // Refresh profile to pick up role/status changes
            useAuthStore.getState().checkAuth();
          } else if (event === 'SIGNED_IN') {
            // Handle cross-tab sign-in; local login() already sets state
            if (!useAuthStore.getState().isAuthenticated) {
              useAuthStore.getState().checkAuth();
            }
          }
        });

        setIsInitialized(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize application';
        console.error('[App] Initialization error:', message);
        setInitError(message);
        setIsInitialized(true); // Still render to show error
      }
    }

    initialize();

    // Cleanup subscription on unmount
    return () => {
      unsubscribeAuth?.();
    };
  }, [checkAuth, queryClient]);

  // Show initialization error if any
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-700 mb-4">{initError}</p>
          <p className="text-sm text-gray-500">
            Please check your environment configuration and ensure all required variables are set.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TooltipProvider>
            {/* Chrome background */}
            <div className="fixed inset-0 -z-10 bg-[#e8e8e8] dark:bg-[#1a1a1a]" />

            {/* Global dev tool panels — fixed to viewport, persist across routes */}
            {import.meta.env.DEV && <DebugToolbar />}

            <Suspense
              fallback={
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                </div>
              }
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppShell><Dashboard /></AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assets"
                  element={
                    <ProtectedRoute>
                      <AppShell><Assets /></AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/maintenance"
                  element={
                    <ProtectedRoute>
                      <AppShell><StubPage title="Maintenance" /></AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <AppShell><Reports /></AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <AppShell><StubPage title="Settings" /></AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="superuser">
                      <AppShell><StubPage title="Admin" /></AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="*"
                  element={
                    <div className="flex items-center justify-center min-h-screen">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4">404</h1>
                        <p className="text-lg mb-4">Page not found</p>
                        <a href="/dashboard" className="text-blue-400 hover:underline">
                          Go to Dashboard
                        </a>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
