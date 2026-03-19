# RGR Fleet Manager

Fleet asset tracking system for Western Australia — iOS mobile app and web dashboard, backed by Supabase.

## Architecture

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.76, Expo 51, WatermelonDB (offline-first) |
| Web | React 18, TypeScript 5, Vite, TailwindCSS, Vision UI |
| Backend | Supabase (PostgreSQL + PostGIS + Deno Edge Functions) |
| Shared | TypeScript packages for types, services, and business logic |
| Build | Turborepo, EAS Build/Submit, Cloudflare Pages |

## Quick Start

```bash
npm install

# Development
npm run dev              # All apps in parallel
npm run dev:mobile       # Mobile only (Expo)
npm run dev:web          # Web only

# Quality
npm run test             # All tests
npm run typecheck        # TypeScript check
npm run lint             # Lint

# Database
npm run db:migrate       # Push Supabase migrations
npm run db:seed          # Seed test data (30 assets, depot, users)
npm run db:reset         # Reset & re-seed

# Building
npm run build            # All packages
```

See `apps/web/QUICK_START.md` and `apps/mobile/README.md` for app-specific setup.

## Packages

| Package | Description |
|---------|-------------|
| `@rgr/mobile` | iOS app (Expo) — v2.0.2 |
| `@rgr/web` | Web dashboard (React + Vite) — v1.0.0 |
| `@rgr/shared` | Business logic, types, service clients |
| `@rgr/ui` | Shared UI components |
| `@rgr/config` | Shared ESLint/TypeScript/Tailwind config |

## Project Status

### Mobile App — Feature Complete

- QR code scanning with camera integration
- Asset browse, search, and filter (status, category, depot)
- Offline-first sync via WatermelonDB with Supabase realtime
- Defect reporting with photo capture and GPS tagging
- Maintenance task creation and completion workflow
- Full admin panel: asset CRUD, user management, depot management, audit log, debug screen
- Role-based access control (Driver, Mechanic, Manager, Superuser)

### Web Dashboard — Feature Complete

- Real-time fleet map (Mapbox GL) with live asset positions
- Assets page: sortable/filterable table, map view, slideout detail panel
- Hazard review workflow: AI-analyzed photos, confidence scores, confirm/dismiss/flag
- Fleet analysis insights powered by the Anthropic Claude API
- Maintenance scheduling and tracking
- Light/dark theme with Vision UI glassmorphism design system
- WCAG 2.1 AA accessibility compliance

### Backend — Production Ready

- 70+ Supabase migrations covering the full schema
- Row-Level Security policies per user role
- PostGIS for geographic queries and asset location
- 6 Deno Edge Functions: auth, admin user creation, push notifications, fleet analysis (daily cron), rego check (daily cron), WA registration lookup

### Known Gaps / Next Steps

- Error tracking: Sentry stubs exist in mobile but are not wired up (console-only today)
- Analytics: `analyticsService.ts` is a placeholder — needs real Supabase queries
- Forgot password: card UI built, email flow not integrated
- Email verification and MFA not yet implemented
- Social login (Google/Microsoft) not implemented

## Documentation

| Doc | Location |
|-----|----------|
| Mobile UI design system | `apps/mobile/MOBILE-UI.md` |
| Auth architecture | `apps/web/AUTH_SETUP.md` |
| Web quick start | `apps/web/QUICK_START.md` |
| Web testing guide | `apps/web/TESTING_GUIDE.md` |
| Hazard component docs | `apps/web/src/components/dashboard/hazards/README.md` |
| Login component docs | `apps/web/src/pages/login/components/README.md` |

## Testing

```bash
npm run test             # Vitest (web) + Jest (mobile)
npm run test:e2e         # Detox E2E (mobile, requires simulator)
```

Web tests use Vitest + React Testing Library + jest-axe (accessibility).
Mobile tests use Jest + React Native Testing Library.
