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

The app is automatically deployed to Azure Static Web Apps on every push to `master`.

**Live URL**: `https://wheelofdoom-swa.azurestaticapps.net` (after initial deployment)

### Automated Deployment (GitHub Actions)

The repository includes a complete CI/CD pipeline (`.github/workflows/azure-deploy.yml`) that:
1. Deploys infrastructure using Bicep templates
2. Builds frontend and backend
3. Deploys to Azure Static Web Apps
4. Runs smoke tests

**To trigger deployment**:
- Push to `master` branch, or
- Manually run the "Deploy to Azure" workflow in GitHub Actions

### Infrastructure as Code

All Azure resources are managed via Bicep templates in the `infra/` directory:
- `main.bicep` - Infrastructure template (Static Web App, Storage Account, Tables)
- `main.bicepparam` - Parameters file
- `README.md` - Detailed setup instructions

### Required GitHub Secrets

Configure these secrets in repository settings → Secrets and variables → Actions:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `AZURE_CLIENT_ID` | Service principal client ID | Created during Azure setup |
| `AZURE_TENANT_ID` | Azure AD tenant ID | Azure Portal → Azure Active Directory |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | Azure Portal → Subscriptions |
| `AZURE_RESOURCE_GROUP` | Resource group name | `rg-wheelofdoom-prod` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token | Static Web App → Manage deployment token |
| `AAD_CLIENT_ID` | Azure AD app client ID | App registration for user auth |
| `AAD_CLIENT_SECRET` | Azure AD app secret | App registration → Certificates & secrets |

### Manual Infrastructure Deployment

```bash
# Create resource group
az group create --name rg-wheelofdoom-prod --location eastus

# Deploy infrastructure
cd infra
az deployment group create \
  --resource-group rg-wheelofdoom-prod \
  --template-file main.bicep \
  --parameters main.bicepparam
```

See `infra/README.md` for detailed setup instructions.

### Azure Resources

| Resource | Type | Purpose |
|----------|------|---------|
| `swa-wheelofdoom` | Static Web App (Standard) | Hosts frontend |
| `func-wheelofdoom` | Function App (Flex Consumption) | Azure Functions backend (.NET 10) |
| `stowheelofdoom` | Storage Account | Azure Table Storage for entries and results |
| Entries | Table | Stores wheel entries |
| Results | Table | Stores spin history |

### Configuration

**Azure AD Authentication**: Configured in `staticwebapp.config.json`
- Update `<TENANT_ID>` placeholder with your Azure AD tenant ID
- All routes require authentication
- Unauthenticated users redirected to `/.auth/login/aad`

**App Settings** (automatically configured by Bicep deployment):

Static Web App settings:
- `AAD_CLIENT_ID` - Azure AD application client ID for authentication
- `AAD_CLIENT_SECRET` - Azure AD application client secret
- `FUNCTION_APP_URL` - Function App endpoint URL

Function App settings:
- `AzureWebJobsStorage` - Storage connection for Functions runtime
- `DEPLOYMENT_STORAGE_CONNECTION_STRING` - For flex consumption deployment
- `ConnectionStrings__tables` - Table Storage connection for application data

**Automated Secret Management**:
- **Storage connection string**: Built using `listKeys()` in Bicep, configured directly in app settings
- **AAD credentials**: Passed as `@secure()` parameters, stored directly in app settings
- **Security**: Secrets never exposed in deployment outputs or history
- **Platform encryption**: Azure encrypts all app settings at rest and in transit

**Security Trade-offs**:
- Secrets stored in app settings (Azure platform security) rather than Key Vault
- No Key Vault audit logging for secret access
- Secret rotation requires updating app settings directly

**Key Insight**: Backend code works unchanged in both development (Aspire) and production (Azure) because `ConnectionStrings__tables` matches Aspire's expected configuration format.

### Cost Estimate

**Monthly**: $10-15
- Azure Static Web Apps Standard: $9/month
- Azure Functions (Flex Consumption): $0-1/month (within free tier)
- Azure Storage: $1-5/month

### Build Configuration

| Setting | Value |
|---------|-------|
| App location | `src/app` |
| Output location | `dist` |
| API location | `src/api` |

### Troubleshooting

**Deployment fails**: Check GitHub Actions logs and Azure Portal deployment center

**Authentication not working**: Verify tenant ID in `staticwebapp.config.json` and AAD app settings

**API errors**: Check Application Insights logs and verify storage connection string

**For detailed deployment instructions**, see `infra/README.md`

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
