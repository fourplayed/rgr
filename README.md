# RGR Fleet Manager - Unified Monorepo

Fleet asset tracking system for Western Australia supporting iOS mobile and web dashboard.

## 🏗️ Architecture

- **Mobile**: React Native (Expo) with offline-first WatermelonDB
- **Web**: React + Vite with Vision UI design system
- **Backend**: Supabase (PostgreSQL + PostGIS + Edge Functions)
- **Shared**: TypeScript libraries for types, services, and business logic

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev              # Run all apps
npm run dev:mobile       # Mobile only
npm run dev:web          # Web only

# Testing
npm run test             # Run all tests
npm run typecheck        # Type check all packages

# Building
npm run build            # Build all packages
```

## 📦 Packages

- `@rgr/mobile` - iOS mobile app (Expo)
- `@rgr/web` - Web dashboard (React + Vite)
- `@rgr/shared` - Shared business logic, types, services
- `@rgr/ui` - Shared UI components
- `@rgr/config` - Shared configuration

## 📖 Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Mobile Development](./docs/MOBILE.md)
- [Web Development](./docs/WEB.md)

## 🔧 Tech Stack

- **Frontend**: React 18, TypeScript 5, TailwindCSS
- **Mobile**: Expo 51, React Native 0.74, WatermelonDB
- **Backend**: Supabase, PostgreSQL, PostGIS, Deno
- **Build**: Turborepo, Vite, EAS Build
- **Deploy**: Cloudflare Pages (web), EAS Submit (iOS)
