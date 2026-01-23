# Development Guide

## Repository Structure

This is a monorepo with separated workspaces:

### Root Directory (/)
**Purpose**: Monorepo coordinator for testing and deployment

- `package.json` - Orchestrates all test commands
- `vitest.config.js` - Vitest configuration (single source of truth)
- `test/` - All test suites (app, api, e2e)
- `staticwebapp.config.json` - Azure deployment config

**Run tests from here**:
```bash
npm run test:app        # Frontend tests
npm run test:api        # Backend tests
npm run test:e2e        # E2E tests
npm test                # All tests
```

### Frontend App (src/app/)
**Purpose**: React application development

- `package.json` - App dependencies (React, Vite, etc.)
- `vite.config.js` - Build and dev server config only
- `src/` - Application source code

**Develop from here**:
```bash
cd src/app
npm run dev             # Start dev server (port 5173)
npm run build           # Build for production
npm run lint            # Run ESLint
```

### Backend API (src/api/)
**Purpose**: .NET 10 Azure Functions

Run via Aspire (`cd src/AppHost && dotnet run`) or manually (`cd src/api && func start`).

### E2E Tests (test/e2e/)
**Purpose**: Isolated Playwright workspace

Has own `package.json`. Run from root with `npm run test:e2e`.

## Why This Structure?

- **Single source of truth**: One vitest config at root (no duplication)
- **Clear boundaries**: src/app for dev, root for testing
- **Standard pattern**: Root coordinates cross-workspace commands
- **Azure compatible**: Deployment files stay at root
