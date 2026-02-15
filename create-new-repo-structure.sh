#!/bin/bash
# Script to create the new RGR monorepo structure
# Run from the root of the new github.com/fourplayed/rgr repository

set -e

echo "🚀 Creating RGR Unified Monorepo Structure..."

# Create main directories
mkdir -p apps/{mobile,web}
mkdir -p packages/{shared,ui,config}
mkdir -p supabase/{migrations,functions}
mkdir -p scripts
mkdir -p docs/architecture
mkdir -p .github/workflows
mkdir -p .vscode

echo "📱 Setting up Mobile app structure..."
mkdir -p apps/mobile/src/{app,components,hooks,services,store,utils,assets}
mkdir -p apps/mobile/src/app/\(auth\)
mkdir -p apps/mobile/src/app/\(tabs\)
mkdir -p apps/mobile/src/components/{Scanner,AssetCard,common}
mkdir -p apps/mobile/src/store/models

echo "🌐 Setting up Web app structure..."
mkdir -p apps/web/src/{pages,components,hooks,services,routes,styles,utils}
mkdir -p apps/web/src/pages/{dashboard,login,assets,maintenance,reports}
mkdir -p apps/web/src/components/{common,dashboard,layout}
mkdir -p apps/web/src/components/common/{Button,Input,Card,Logo}
mkdir -p apps/web/src/components/dashboard/{navigation,vision,map}
mkdir -p apps/web/src/components/layout
mkdir -p apps/web/src/styles/themes
mkdir -p apps/web/public

echo "📦 Setting up Shared packages..."
mkdir -p packages/shared/src/{types,schemas,services,utils,hooks}
mkdir -p packages/shared/src/types/{api,database,enums}
mkdir -p packages/shared/src/services/{api,supabase}

mkdir -p packages/ui/src/{components,primitives}
mkdir -p packages/ui/src/components/{Button,Input,Card,Text}

mkdir -p packages/config/src

echo "🗄️ Setting up Supabase structure..."
mkdir -p supabase/functions/{scan-webhook,generate-qr,maintenance-reminder}

echo "📄 Creating root configuration files..."

# Root package.json
cat > package.json << 'EOF'
{
  "name": "rgr-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:mobile": "npm run dev --workspace=@rgr/mobile",
    "dev:web": "npm run dev --workspace=@rgr/web",
    "build": "turbo run build",
    "build:mobile": "npm run build --workspace=@rgr/mobile",
    "build:web": "npm run build --workspace=@rgr/web",
    "test": "turbo run test",
    "test:mobile": "npm run test --workspace=@rgr/mobile",
    "test:web": "npm run test --workspace=@rgr/web",
    "test:shared": "npm run test --workspace=@rgr/shared",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint -- --fix",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:migrate": "cd supabase && supabase db push",
    "db:reset": "cd supabase && supabase db reset",
    "db:seed": "cd supabase && psql $DATABASE_URL < seed.sql"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0"
  },
  "packageManager": "npm@10.0.0",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
EOF

# Turbo configuration
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".expo/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts", "test/**/*.tsx"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
EOF

# Root tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "incremental": true
  }
}
EOF

# .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
.expo/
.next/
*.tsbuildinfo

# Testing
coverage/
.nyc_output/

# Environment variables
.env
.env.local
.env.*.local

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Temporary
.tmp/
.temp/
*.tmp

# Supabase
supabase/.branches/
supabase/.temp/
EOF

# ESLint config
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', 'build', 'node_modules', '.expo'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
EOF

# Prettier config
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF

# VS Code settings
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
EOF

# VS Code extensions
cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "expo.vscode-expo-tools"
  ]
}
EOF

echo "📦 Creating package.json files for each workspace..."

# Mobile package.json
cat > apps/mobile/package.json << 'EOF'
{
  "name": "@rgr/mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "build:ios": "eas build --platform ios",
    "submit:ios": "eas submit --platform ios",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@rgr/shared": "*",
    "@rgr/ui": "*",
    "@rgr/config": "*",
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "@react-native-async-storage/async-storage": "^1.23.0",
    "@watermelondb/watermelondb": "^0.27.0",
    "@supabase/supabase-js": "^2.44.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "^5.5.0",
    "jest": "^29.0.0"
  }
}
EOF

# Web package.json
cat > apps/web/package.json << 'EOF'
{
  "name": "@rgr/web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@rgr/shared": "*",
    "@rgr/ui": "*",
    "@rgr/config": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "@tanstack/react-query": "^5.40.0",
    "@supabase/supabase-js": "^2.44.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^1.6.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
EOF

# Shared package.json
cat > packages/shared/package.json << 'EOF'
{
  "name": "@rgr/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.44.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "jest": "^29.0.0"
  }
}
EOF

# UI package.json
cat > packages/ui/package.json << 'EOF'
{
  "name": "@rgr/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "react-native": "./dist/index.native.js",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-native": ">=0.70.0"
  },
  "dependencies": {
    "@rgr/shared": "*"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
EOF

# Config package.json
cat > packages/config/package.json << 'EOF'
{
  "name": "@rgr/config",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
EOF

echo "📄 Creating TypeScript configs for each workspace..."

# Shared tsconfig
cat > packages/shared/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF

# UI tsconfig
cat > packages/ui/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Config tsconfig
cat > packages/config/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Mobile tsconfig
cat > apps/mobile/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@rgr/shared": ["../../packages/shared/src"],
      "@rgr/ui": ["../../packages/ui/src"],
      "@rgr/config": ["../../packages/config/src"]
    }
  },
  "include": ["src/**/*", "app.json"],
  "exclude": ["node_modules"]
}
EOF

# Web tsconfig
cat > apps/web/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "paths": {
      "@/*": ["./src/*"],
      "@rgr/shared": ["../../packages/shared/src"],
      "@rgr/ui": ["../../packages/ui/src"],
      "@rgr/config": ["../../packages/config/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
EOF

echo "📋 Creating placeholder README files..."

cat > README.md << 'EOF'
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
EOF

cat > apps/mobile/README.md << 'EOF'
# RGR Mobile App (iOS)

React Native mobile app for fleet asset scanning and tracking.

## Features

- QR code scanning
- GPS location tracking
- Offline-first with WatermelonDB
- Photo capture and upload
- Real-time sync with Supabase

## Development

```bash
npm run dev        # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run build:ios  # Build production iOS app
```

## Tech Stack

- Expo Router (file-based routing)
- WatermelonDB (offline storage)
- React Native Camera
- AsyncStorage
EOF

cat > apps/web/README.md << 'EOF'
# RGR Web Dashboard

React web dashboard for fleet management and reporting.

## Features

- Real-time fleet tracking
- Asset management
- Maintenance scheduling
- Reports and analytics
- Vision UI design system

## Development

```bash
npm run dev      # Start Vite dev server (localhost:3000)
npm run build    # Build for production
npm run preview  # Preview production build
```

## Tech Stack

- React Router 6
- TanStack Query
- Google Maps API
- TailwindCSS + Vision UI
- Vite
EOF

echo "✅ Monorepo structure created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. cd to your new repo: cd /path/to/github.com/fourplayed/rgr"
echo "2. Run this script: bash /path/to/create-new-repo-structure.sh"
echo "3. Install dependencies: npm install"
echo "4. Start migrating code from existing packages"
echo "5. Test both mobile and web apps"
echo ""
echo "📚 See docs/NEW_MONOREPO_STRUCTURE.md for detailed migration guide"
