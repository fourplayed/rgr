# RGR Mobile — Implementation Brief for Claude Code (Mac)

> **Context**: This document provides everything needed to implement the React Native
> Scan-First MVP. The shared foundation (`@rgr/shared`) is already built and
> cross-platform ready. The mobile project is scaffolded with Expo + Expo Router.

## What's Already Done

### Shared Package (fully cross-platform)
- **Types/Entities**: `Asset`, `ScanEvent`, `MaintenanceRecord`, `HazardAlert`, `Depot`, `Photo`
  - Location: `packages/shared/src/types/entities/`
  - Pattern: `XxxRow` (snake_case DB) + `Xxx` (camelCase app) + `mapRowToXxx()` mapper
- **Enums**: `AssetStatus`, `AssetCategory`, `ScanType`, `MaintenanceStatus/Priority`, `HazardSeverity/Status`, `UserRole`
  - Location: `packages/shared/src/types/enums/`
  - Each has: const object, type, Zod schema, labels, colors
- **Supabase Service**: `packages/shared/src/services/supabase/assets.ts`
  - `listAssets`, `getAsset`, `createAsset`, `updateAsset`, `softDeleteAsset`
  - `getAssetScans`, `createScanEvent` (for QR scan flow)
  - `getAssetByQRCode` (lookup from QR data)
  - `getMyRecentScans` (driver's activity)
  - `getAssetMaintenance`, `getAssetHazards`, `listDepots`
  - All return `ServiceResult<T>` = `{ data: T | null, error: string | null }`
- **Auth Service**: `packages/shared/src/services/supabase/auth.ts`
  - `signInWithEmail`, `signOut`, `getSession`, `fetchProfile`
- **Supabase Client**: `packages/shared/src/services/supabase/client.ts`
  - `initSupabase(config)` — accepts optional `storage` (AsyncStorage) and `detectSessionInUrl` (false for RN)
- **Utilities**: `packages/shared/src/utils/`
  - `parseQRCode(value)` — parses `rgr://asset/{UUID}`, asset numbers, raw UUIDs
  - `isValidQRCode(value)`, `isAssetNumber(value)`, `extractAssetInfo(value)`
  - `formatDate`, `formatRelativeTime`, `retry`, `debounce`, etc.

### Mobile Scaffold (exists but empty)
```
apps/mobile/
  package.json          ← Expo 51, RN 0.74, AsyncStorage, Supabase, WatermelonDB
  tsconfig.json         ← Path aliases for @rgr/shared configured
  src/
    index.tsx           ← Placeholder (export {})
    app/(auth)/         ← Empty — Expo Router auth group
    app/(tabs)/         ← Empty — Expo Router tabs group
    components/         ← Empty dirs: AssetCard/, common/, Scanner/
    hooks/              ← Empty
    services/           ← Empty
    store/              ← Empty
    utils/              ← Empty
```

---

## What Needs to Be Built

### Phase 1: Configuration (before any code runs)

1. **`apps/mobile/app.json`** — Expo app config
   ```json
   {
     "expo": {
       "name": "RGR Fleet",
       "slug": "rgr-mobile",
       "version": "1.0.0",
       "orientation": "portrait",
       "scheme": "rgr",
       "icon": "./src/assets/icon.png",
       "userInterfaceStyle": "automatic",
       "splash": { "backgroundColor": "#000030" },
       "ios": {
         "supportsTablet": false,
         "bundleIdentifier": "com.rgr.fleet",
         "infoPlist": {
           "NSCameraUsageDescription": "Camera is used to scan QR codes on fleet assets",
           "NSLocationWhenInUseUsageDescription": "Location is captured during asset scans for fleet tracking"
         }
       },
       "plugins": [
         "expo-router",
         ["expo-camera", { "cameraPermission": "Camera is used to scan QR codes on fleet assets" }],
         ["expo-location", { "locationWhenInUsePermission": "Location is captured during asset scans" }]
       ]
     }
   }
   ```

2. **`apps/mobile/metro.config.js`** — Monorepo Metro resolution
   ```javascript
   const { getDefaultConfig } = require('expo/metro-config');
   const path = require('path');

   const projectRoot = __dirname;
   const monorepoRoot = path.resolve(projectRoot, '../..');

   const config = getDefaultConfig(projectRoot);
   config.watchFolders = [monorepoRoot];
   config.resolver.nodeModulesPaths = [
     path.resolve(projectRoot, 'node_modules'),
     path.resolve(monorepoRoot, 'node_modules'),
   ];

   module.exports = config;
   ```

3. **Install additional dependencies** (some may already be in package.json):
   ```bash
   cd apps/mobile
   npx expo install expo-camera expo-location expo-haptics
   npm install zustand @tanstack/react-query
   ```

### Phase 2: App Entry + Supabase Init

**`apps/mobile/src/app/_layout.tsx`** — Root layout (Expo Router)
- Initialize Supabase with AsyncStorage: `initSupabase({ url, anonKey, storage: AsyncStorage, detectSessionInUrl: false })`
- Wrap in `QueryClientProvider` (React Query)
- Auth gate: check session → redirect to (auth) or (tabs)

### Phase 3: Auth Flow

**`apps/mobile/src/app/(auth)/login.tsx`** — Login screen
- Email/password form
- Uses `signInWithEmail` from `@rgr/shared`
- On success: `router.replace('/(tabs)')` (Expo Router)

**`apps/mobile/src/store/authStore.ts`** — Zustand auth store
- Same pattern as web: `useAuthStore` with `user`, `isAuthenticated`, `login`, `logout`, `checkAuth`
- Uses `fetchProfile` from shared for authoritative profile data

### Phase 4: Main Tab Screens

**Navigation structure** (Expo Router file-based):
```
src/app/
  _layout.tsx             ← Root: Supabase init, QueryClient, auth gate
  (auth)/
    _layout.tsx           ← Auth stack layout
    login.tsx             ← Login screen
  (tabs)/
    _layout.tsx           ← Bottom tab navigator (Assets, Scan, Activity)
    index.tsx             ← Assets tab (redirects to assets/)
    assets/
      index.tsx           ← AssetListScreen
      [id].tsx            ← AssetDetailScreen
    scan.tsx              ← ScanScreen (camera QR reader)
    activity.tsx          ← RecentScansScreen
```

**Tab: Assets**
- `AssetListScreen`: FlatList, search bar, status filter chips, pull-to-refresh
  - Uses `listAssets()` from shared (via React Query)
  - Tap row → push to `AssetDetailScreen`
- `AssetDetailScreen`: Asset info card, recent scan timeline, maintenance summary
  - Uses `getAsset()`, `getAssetScans()` from shared
  - "Scan This Asset" button → navigate to scan tab with pre-filled assetId

**Tab: Scan (the killer feature)**
- `ScanScreen`: Camera viewfinder with QR overlay
  - Uses `expo-camera` with `onBarCodeScanned`
  - On QR decode → `getAssetByQRCode(qrData)` from shared
  - Asset found → show confirmation sheet:
    - Asset name/number, status, GPS coords + accuracy
    - "Last scanned X days ago at [depot]"
    - [Confirm Scan] button
  - On confirm → `createScanEvent({ assetId, scannedBy, scanType: 'qr_scan', latitude, longitude, ... })`
  - DB trigger auto-updates asset.last_latitude/longitude
  - Success haptic + animation → return to camera

**Tab: Activity**
- `RecentScansScreen`: Driver's own scan history
  - Uses `getMyRecentScans(userId)` from shared
  - FlatList sorted by created_at DESC

### Phase 5: Hooks & Components

**Hooks:**
- `useAssetData.ts` — React Query hooks wrapping shared services (same pattern as web)
- `useLocation.ts` — Wraps `expo-location` for GPS
- `useQRScanner.ts` — Camera + QR decode state management

**Components:**
- `AssetListItem.tsx` — FlatList row: asset number, status badge, last scan time
- `AssetInfoCard.tsx` — Detail screen header card
- `StatusBadge.tsx` — Colored status pill (reuses `AssetStatusColors` from shared)
- `FilterChips.tsx` — Horizontal scrolling status filter chips
- `ScanConfirmSheet.tsx` — Bottom sheet after QR decode

**Config:**
- `config/supabase.ts` — Supabase init with AsyncStorage adapter

**Theme:**
- `theme/colors.ts` — RGR color palette (navy #000030, electric blue, chrome, status colors)
- `theme/spacing.ts` — Consistent spacing scale (4, 8, 12, 16, 20, 24, 32, 48)

---

## Key Shared Service Functions to Use

### For QR Scan Flow
```typescript
import { getAssetByQRCode, createScanEvent } from '@rgr/shared';
import type { CreateScanEventInput } from '@rgr/shared';

// 1. Lookup asset from QR code
const result = await getAssetByQRCode(qrData);
if (result.error) { /* show error */ }
const asset = result.data;

// 2. Submit scan event with GPS
const scanInput: CreateScanEventInput = {
  assetId: asset.id,
  scannedBy: userId,
  scanType: 'qr_scan',
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  accuracy: location.coords.accuracy,
  altitude: location.coords.altitude,
  heading: location.coords.heading,
  speed: location.coords.speed,
  deviceInfo: { platform: 'ios', model: Device.modelName },
};
const scanResult = await createScanEvent(scanInput);
```

### For Asset List
```typescript
import { listAssets } from '@rgr/shared';

const result = await listAssets({
  page: 1,
  pageSize: 20,
  statuses: ['active', 'maintenance'],
  sortField: 'assetNumber',
  sortDirection: 'asc',
});
// result.data = { data: Asset[], total, page, pageSize, totalPages }
```

### For Supabase Init (mobile)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initSupabase } from '@rgr/shared';

initSupabase({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  storage: AsyncStorage,
  detectSessionInUrl: false,
});
```

---

## Database Context

- 9 tables: depots, profiles, assets, scan_events, photos, freight_analysis, hazard_alerts, maintenance_records, audit_log
- **scan_events trigger**: When a scan event is inserted with lat/lng, auto-updates `assets.last_latitude/longitude/accuracy/last_location_updated_at/last_scanned_by`
- **RLS**: All authenticated users can read. Drivers can insert scan_events. Managers+ can CRUD assets.
- **Realtime**: Enabled on scan_events, assets, hazard_alerts

## Environment Variables

Mobile uses `EXPO_PUBLIC_` prefix:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

These should match the web app's Supabase project.
