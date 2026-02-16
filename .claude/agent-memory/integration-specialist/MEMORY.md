# Integration Specialist Memory

## Project: RGR (Trailer Management System)

### Authentication Flow Patterns

**Deferred Navigation Pattern** (Login.tsx + LoginPresenter.tsx)
- Navigation is deferred using a ref-based queue to allow async workflows to complete
- `pendingNavRef` stores the navigation path
- `onNavigationReady()` callback flushes pending navigation
- 2-second delay after workflow completion gives users time to review logs
- Pattern: Store nav path → Wait for signal → Execute navigation

**Workflow Visualization** (DebugToolbar.tsx)
- Dev-tools panel with workflow log tab for authentication steps
- Auto-opens and switches tabs when workflow starts
- Persists state across remounts via localStorage
- Accumulates multiple workflow runs with separators
- Never auto-closes (manual close only)
- Keys: `debug-toolbar-open`, `debug-toolbar-tab`, `debug-toolbar-workflow-steps`

### State Persistence Patterns

**localStorage for Dev Tools**
- Panel state persists across page navigations/remounts
- Workflow step history accumulates across login attempts
- Visual separators between workflow runs (id: `separator-${timestamp}`)
- useRef tracks current workflow run ID to detect new runs vs. updates

### React Patterns in Codebase

**useState with localStorage initialization**
```typescript
const [state, setState] = useState(() => {
  const stored = localStorage.getItem('key');
  return stored ? JSON.parse(stored) : defaultValue;
});
```

**useEffect for localStorage sync**
```typescript
useEffect(() => {
  localStorage.setItem('key', JSON.stringify(value));
}, [value]);
```

**useRef for workflow tracking**
- Used to track workflow run IDs without triggering re-renders
- Persists across renders but doesn't cause updates

### File Locations

- Login page container: `rgr/apps/web/src/pages/Login.tsx`
- Login presenter (UI): `rgr/apps/web/src/pages/login/LoginPresenter.tsx`
- Login form card: `rgr/apps/web/src/pages/login/components/LoginFormCard.tsx`
- Debug toolbar: `rgr/apps/web/src/pages/login/components/DebugToolbar.tsx`
- Login logic hook: `rgr/apps/web/src/pages/login/useLoginLogic.ts`

### Authentication Workflow Steps

1. Establishing connection (Supabase)
2. Authenticating user (credential verification)
3. Creating session (JWT token)
4. Loading user profile (database query)
5. Checking permissions (RBAC)
6. Syncing application data (fleet assets, scans)

Total duration: ~4 seconds with staggered delays
