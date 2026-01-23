# Wheel of Doom

[![PR Tests](https://github.com/thisispaulsmith/wheelofdoom/actions/workflows/pr-tests.yml/badge.svg)](https://github.com/thisispaulsmith/wheelofdoom/actions/workflows/pr-tests.yml)

A fun spinning wheel web app for random team task assignment. Built with React, .NET Azure Functions, and Azure Static Web Apps.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Azure Functions Core Tools](https://docs.microsoft.com/azure/azure-functions/functions-run-local) (v4)
- [Docker](https://www.docker.com/) (for Aspire/Azurite emulator)

## Quick Start (Recommended)

The easiest way to run the full stack locally is with .NET Aspire:

```bash
cd src/AppHost
dotnet run
```

This starts:
- **Azurite** - Azure Storage emulator for table storage
- **API** - Azure Functions backend on port 7071
- **Frontend** - React dev server on port 5173
- **Aspire Dashboard** - Observability UI (URL shown in console)

## Manual Setup

### Frontend (src/app)

```bash
cd src/app
npm install
npm run dev
```

Runs on http://localhost:5173

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Dev server port | `5173` |

The frontend proxies `/api/*` requests to `http://localhost:7071` in development (configured in `vite.config.js`).

### Backend API (src/api)

```bash
cd src/api
func start
```

Runs on http://localhost:7071

#### Environment Variables

Configure in `src/api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"
  }
}
```

| Variable | Description | Default |
|----------|-------------|---------|
| `AzureWebJobsStorage` | Azure Storage connection string | `UseDevelopmentStorage=true` (Azurite) |
| `FUNCTIONS_WORKER_RUNTIME` | Functions runtime | `dotnet-isolated` |

**Note:** `local.settings.json` is gitignored. Copy the template to get started:

```bash
cp src/api/local.settings.template.json src/api/local.settings.json
```

### Storage Emulator (Azurite)

If not using Aspire, run Azurite manually:

```bash
# Via npm
npm install -g azurite
azurite --silent --location .azurite --debug .azurite/debug.log

# Or via Docker
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite
```

## Project Structure

```
├── WheelOfDoom.slnx           # .NET solution file
├── staticwebapp.config.json   # Azure Static Web Apps config
├── src/
│   ├── app/                   # React frontend (Vite)
│   ├── api/                   # .NET 10 Azure Functions
│   ├── AppHost/               # .NET Aspire orchestration
│   └── ServiceDefaults/       # Aspire shared configuration
└── test/
    ├── app/                   # Frontend tests (Vitest)
    ├── api/                   # Backend tests (xUnit)
    └── e2e/                   # E2E tests (Playwright)
```

## Testing

**All tests run from the root directory** (not from src/app/).

### Frontend Tests (Vitest)

```bash
# From repository root
npm run test:app              # Run once (53 tests)
npm run test:app:watch        # Watch mode
```

Frontend tests are in `test/app/` and use the root `vitest.config.js`.

### Backend Tests (xUnit)

```bash
# From repository root
npm run test:api              # .NET tests (19 tests)

# Or directly
dotnet test WheelOfDoom.slnx
```

### E2E Tests (Playwright)

```bash
# From repository root
npm run test:e2e

# Or from test/e2e directory
cd test/e2e
npm test                      # Basic run
npm run test:ui              # Interactive UI mode
```

### Run All Tests

```bash
# From repository root
npm test                      # Runs frontend + backend tests
```

### Continuous Integration

All pull requests automatically run three test suites via GitHub Actions:
- **Frontend Tests** (Vitest): 53 unit and component tests
- **Backend Tests** (xUnit): 19 API and service tests
- **E2E Tests** (Playwright): 10 end-to-end user flow tests

All test suites must pass before a PR can be merged.

View test results: [GitHub Actions](https://github.com/thisispaulsmith/wheelofdoom/actions)

## Azure Deployment

### Azure Static Web Apps Configuration

The app is configured for Azure Static Web Apps with Azure AD authentication.

1. Create an Azure Static Web App resource
2. Configure Azure AD app registration
3. Update `staticwebapp.config.json` with your tenant ID:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<YOUR_TENANT_ID>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  }
}
```

4. Set application settings in Azure:
   - `AAD_CLIENT_ID` - Azure AD application (client) ID
   - `AAD_CLIENT_SECRET` - Azure AD client secret
   - `AzureWebJobsStorage` - Azure Storage connection string

### Build Configuration

| Setting | Value |
|---------|-------|
| App location | `src/app` |
| Output location | `dist` |
| API location | `src/api` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List all wheel entries |
| POST | `/api/entries` | Add entry `{ "name": "..." }` |
| DELETE | `/api/entries/{name}` | Remove an entry |
| GET | `/api/results` | Get spin history |
| POST | `/api/results` | Record spin `{ "name": "..." }` |

## Features

- Animated spinning wheel with dramatic slowdown
- Sound effects (Web Audio API synthesized)
- Confetti celebration on winner selection
- Persistent entries and results history
- Azure AD authentication
- Real-time updates across team members

## License

MIT
