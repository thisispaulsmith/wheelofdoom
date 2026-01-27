# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Wheel of Doom** is a team task assignment app with an animated spinning wheel. It uses React + Vite frontend, .NET 8 Azure Functions backend, Azure Table Storage, and .NET Aspire for local orchestration.

**Main Branch**: `master`
**Current Branch**: `feature/initial-build`

## Development Commands

### Running the App (Aspire - Recommended)
```bash
cd src/AppHost
dotnet run
```
This orchestrates Azurite, API (port 7071), Frontend (port 5173), and Aspire Dashboard.

### Manual Start
```bash
# Frontend only
cd src/app
npm ci --legacy-peer-deps
npm run dev

# Backend only (requires Azurite running)
cd src/api
cp local.settings.template.json local.settings.json  # First time only
func start
```

### Testing
```bash
# Frontend tests (53 tests)
npm run test:app
npm run test:app:watch              # Watch mode

# Backend tests (19 tests)
dotnet test WheelOfDoom.slnx
dotnet test test/api                # API tests only

# E2E tests (requires frontend running on :5173)
npm run test:e2e
```

### Building
```bash
# Frontend
cd src/app && npm run build         # Outputs to src/app/dist

# Backend
cd src/api && dotnet publish -c Release
```

## Architecture Insights

### Aspire Configuration (`src/AppHost/AppHost.cs`)

**Azure Functions with Aspire:**
- Uses `.AddAzureFunctionsProject<Projects.WheelOfDoom_Api>("api")` instead of `.AddProject()`
- `.WithReference(tables)` automatically passes Azure Table Storage connection via environment variables
- `.WaitFor(tables)` ensures storage is ready before Functions start

**Frontend to API Communication:**
- `.WithReference(api)` sets `services__api__http__0` and `services__api__https__0`
- `.WithHttpEndpoint(env: "PORT")` tells the frontend which port to bind to
- Frontend must listen on `0.0.0.0` (not `localhost`) to be accessible through Aspire's proxy

**Vite Configuration** (`src/app/vite.config.js`):
```javascript
server: {
  port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
  host: '0.0.0.0',  // Critical for Aspire
  proxy: {
    '/api': {
      target: process.env.services__api__http__0 || 'http://localhost:7071',
      changeOrigin: true,
    }
  }
}
```

**Azure Functions Integration** (`src/api/Program.cs`):
- Uses `FunctionsApplication.CreateBuilder(args)` (not `HostBuilder`)
- Calls `builder.AddServiceDefaults()` to integrate with Aspire
- **Do not** include `AddApplicationInsightsTelemetryWorkerService()` - handled by ServiceDefaults
- Connection strings come from Aspire app host configuration

### Data Flow Architecture

```
User Action → React Hook → API Utility (fetch) → Vite Proxy
  → Azure Function → TableStorageService → Azure Table Storage
```

**Key Pattern**:
- Components use custom hooks (`useEntries`, `useResults`, `useSound`)
- Hooks call utility functions in `src/app/src/utils/api.js`
- API utilities use relative paths (`/api/entries`) that Vite proxies
- Backend functions delegate to `TableStorageService` for all storage operations

### Table Storage Implementation

**Entries Table** (PartitionKey: "wheel", RowKey: person name):
- Uses `UpsertEntityAsync()` - creates or updates silently
- Natural alphabetical sort by name

**Results Table** (PartitionKey: "wheel", RowKey: inverted timestamp):
- RowKey = `DateTime.MaxValue.Ticks - DateTime.UtcNow.Ticks`
- This ensures newest results sort first without explicit ORDER BY
- See `src/api/Models/SpinResult.cs` for implementation

### Authentication Flow

**Production**: Azure Static Web App enforces Azure AD authentication
- User identity in `X-MS-CLIENT-PRINCIPAL-NAME` header
- Functions extract user via `req.Headers["x-ms-client-principal-name"]`
- Unauthenticated requests redirected to `/.auth/login/aad`

**Local Development**: Falls back to "anonymous" when header is missing

### Sound Synthesis (`src/app/src/hooks/useSound.js`)

Uses Web Audio API to generate all sounds (no external files):
- **Tick**: 50ms sine wave at 800Hz (wheel segment clicks)
- **Drumroll**: 100ms → 30ms accelerating low-frequency oscillations
- **Fanfare**: Chord progression using multiple oscillators with gain envelopes

Browser autoplay policy requires user interaction before audio context starts.

## Key Files to Understand

### Frontend Core
- `src/app/src/App.jsx` - Main component, orchestrates wheel spin and state
- `src/app/src/components/Wheel.jsx` - Canvas-based wheel animation (60fps, ~7s spin)
- `src/app/src/hooks/useEntries.js` - Manages entry CRUD with error handling
- `src/app/src/utils/api.js` - All API fetch functions (single source of truth for endpoints)

### Backend Core
- `src/api/Program.cs` - Aspire integration with `FunctionsApplication.CreateBuilder()`, ServiceDefaults, and DI
- `src/api/Services/TableStorageService.cs` - Wraps Azure.Data.Tables SDK
- `src/api/Functions/EntriesFunction.cs` - GET/POST entries with validation
- `src/api/Models/SpinResult.cs` - Contains inverted timestamp logic

### Configuration
- `staticwebapp.config.json` - Azure AD auth, route protection, SPA fallback
- `src/AppHost/AppHost.cs` - Aspire orchestration with service references
- `src/api/local.settings.json` - Required for local dev (gitignored, use template)

## API Specification

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/entries` | - | `[{name, addedBy, addedAt}]` (sorted A-Z) |
| POST | `/api/entries` | `{name}` | `{name, addedBy, addedAt}` |
| DELETE | `/api/entries/{name}` | - | 204 No Content |
| GET | `/api/results` | - | `[{selectedName, spunBy, spunAt}]` (newest first, max 50) |
| POST | `/api/results` | `{name}` | `{selectedName, spunBy, spunAt}` |

## Common Development Tasks

### Adding a New API Endpoint
1. Create function class in `src/api/Functions/` with `[Function("FunctionName")]` attribute
2. Inject `ITableStorageService` via constructor
3. Extract user identity: `req.Headers["x-ms-client-principal-name"] ?? "anonymous"`
4. Add corresponding frontend utility function in `src/app/src/utils/api.js`
5. Create/update custom hook in `src/app/src/hooks/` for React state management

### Modifying Azure Functions with Aspire
**Key Pattern (from Microsoft docs):**
```csharp
using Microsoft.Azure.Functions.Worker.Builder;

var builder = FunctionsApplication.CreateBuilder(args);
builder.AddServiceDefaults();  // Aspire integration
builder.ConfigureFunctionsWebApplication();
// Register services
builder.Build().Run();
```

**Important:**
- Use `FunctionsApplication.CreateBuilder(args)` not `new HostBuilder()`
- Call `AddServiceDefaults()` before `ConfigureFunctionsWebApplication()`
- Don't add Application Insights directly - ServiceDefaults handles it
- AppHost must use `AddAzureFunctionsProject<T>()` not `AddProject<T>()`

### Modifying Table Storage Schema
1. Update model class in `src/api/Models/` (must implement `ITableEntity`)
2. Update `TableStorageService` methods if query logic changes
3. Consider migration strategy - Table Storage is schema-less but clients may need updates
4. Test with Azurite locally before deploying

### Adding Sound Effects
1. Create synthesizer function in `src/app/src/hooks/useSound.js`
2. Use `audioContext.createOscillator()` and `audioContext.createGain()`
3. Set frequency, type (sine/square/sawtooth), and gain envelope
4. Schedule with `oscillator.start(time)` and `oscillator.stop(time + duration)`
5. Register callback in `src/app/src/App.jsx` during wheel interactions

## Azure Deployment

### Deployment Architecture

The app deploys to **Azure Static Web Apps** with:
- React frontend served as static files
- .NET Azure Functions as managed backend (not containerized)
- Azure Table Storage for data persistence
- Azure AD for authentication

**Key Insight**: Backend code works unchanged in both development (Aspire) and production (Azure) because `ConnectionStrings__tables` configuration matches Aspire's expected format.

### Infrastructure as Code

All Azure resources are defined in `infra/` directory:

```
infra/
├── main.bicep           # Infrastructure template
├── main.bicepparam      # Parameters (tenant ID, resource names)
└── README.md            # Detailed deployment instructions
```

**Resources Created**:
1. Azure Static Web App (Standard tier) - `wheelofdoom-swa`
2. Storage Account (Standard LRS) - `wheelodomstorage`
3. Table Service with Entries and Results tables
4. Azure Key Vault (Standard tier) - `wheelofdoom-kv` (secure secret storage)

**Deploy Infrastructure**:
```bash
az group create --name rg-wheelofdoom-prod --location eastus
az deployment group create \
  --resource-group rg-wheelofdoom-prod \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam \
  --parameters aadClientId='<your-aad-client-id>' aadClientSecret='<your-aad-client-secret>'
```

**Note**: Secure parameters (`aadClientId` and `aadClientSecret`) are passed via command line. The Bicep template handles all configuration automatically.

### CI/CD Pipeline

**Workflow**: `.github/workflows/azure-deploy.yml`

**Three Jobs**:
1. **deploy-infrastructure**: Single Bicep deployment that handles everything - infrastructure, secrets, RBAC, and app settings
2. **deploy-application**: Builds frontend/backend, deploys to Static Web Apps
3. **run-smoke-tests**: Verifies deployment health

**Triggers**:
- Automatic: Push to `master` branch
- Manual: GitHub Actions → "Deploy to Azure" → Run workflow

**Required GitHub Secrets** (7 total):
- `AZURE_CLIENT_ID` - Service principal for deployment
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
- `AZURE_RESOURCE_GROUP` - `rg-wheelofdoom-prod`
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - SWA deployment token
- `AAD_CLIENT_ID` - Azure AD app for user authentication
- `AAD_CLIENT_SECRET` - Azure AD app secret

### Configuration Mapping

**Development (Aspire)** → **Production (Azure Static Web Apps)**:

| Setting | Aspire (Local) | Azure (Production) |
|---------|----------------|-------------------|
| Storage Connection | `ConnectionStrings__tables` from AppHost | `ConnectionStrings__tables` app setting |
| User Identity | `"anonymous"` | `x-ms-client-principal-name` header |
| Authentication | Bypassed | Azure AD via `staticwebapp.config.json` |
| API URL | Vite proxy to `localhost:7071` | Managed Functions integration |

**Critical Pattern**: All secrets and configuration managed in Bicep (fully declarative):

1. **Secure Parameters** - AAD credentials passed via `@secure()` decorated parameters:
   - `aadClientId` and `aadClientSecret` passed from GitHub secrets to Bicep
   - `@secure()` decorator masks values in deployment history
   - Parameters stored as Key Vault secrets: `aad-client-id` and `aad-client-secret`

2. **Storage Connection String** - Created via Key Vault secret resource:
   - Uses `listKeys()` to retrieve storage account key (safe in secret resource, not in outputs)
   - Value stored encrypted in Key Vault as `storage-connection-string`
   - Never appears in deployment outputs or history

3. **RBAC Permissions** - Configured declaratively in Bicep:
   - GitHub Actions service principal granted Key Vault Secrets Officer role
   - Uses `Microsoft.Authorization/roleAssignments` resource
   - No workflow CLI commands needed

4. **App Settings** - Configured via `staticSites/config` resource in Bicep:
   - All settings use Key Vault reference syntax: `@Microsoft.KeyVault(VaultName=...;SecretName=...)`
   - Settings deployed atomically with infrastructure
   - No manual configuration steps required

**Security Pattern**:
- ✅ `listKeys()` in **outputs** = BAD (plaintext exposure)
- ✅ `listKeys()` in **secret resource** = GOOD (encrypted in Key Vault)
- ✅ All secrets managed in Bicep (single source of truth)
- ✅ No workflow CLI commands for configuration

This allows `src/api/Program.cs` to remain unchanged while ensuring security:
```csharp
builder.AddAzureTableServiceClient("tables");  // Works in both environments!
```

**Security Benefits**:
- ✅ **Fully declarative** - All secrets and configuration in Bicep
- ✅ **No workflow steps** - Single deployment handles everything
- ✅ **Atomic deployment** - Settings deployed with infrastructure
- ✅ **Secure parameters** - `@secure()` masks values in history
- ✅ **No secrets in outputs** - All secrets in Key Vault only
- ✅ **RBAC as code** - Permission grants defined in Bicep
- ✅ **Audit logs** - All secret access logged
- ✅ **Encryption** - At rest and in transit

### Deployment Workflow Steps

**Frontend Build**:
```bash
cd src/app
npm ci --legacy-peer-deps
npm run build                # Outputs to src/app/dist
```

**Backend Build**:
```bash
cd src/api
dotnet restore
dotnet publish -c Release -o ./publish
```

**Deploy to Azure**:
Uses `Azure/static-web-apps-deploy@v1` action with:
- `app_location: "src/app"`
- `api_location: "src/api"`
- `output_location: "dist"`
- `skip_app_build: true` (already built)
- `skip_api_build: true` (already built)

### Azure AD Authentication Setup

**1. Create App Registration**:
```bash
# Azure Portal → Azure Active Directory → App registrations → New registration
# Name: WheelOfDoom-Auth
# Supported account types: Single tenant
```

**2. Create Client Secret**:
```bash
# App registration → Certificates & secrets → New client secret
# Save as AAD_CLIENT_SECRET in GitHub secrets
```

**3. Configure Redirect URI** (after Static Web App is deployed):
```
Type: Web
URI: https://wheelofdoom-swa.azurestaticapps.net/.auth/login/aad/callback
```

**4. Update Tenant ID**:
Edit `staticwebapp.config.json` line 6 or `infra/main.bicepparam`:
```json
"openIdIssuer": "https://login.microsoftonline.com/<YOUR_TENANT_ID>/v2.0"
```

### Verifying Deployment

**Check Infrastructure**:
```bash
az resource list --resource-group rg-wheelofdoom-prod --output table
```

**Check App Settings**:
```bash
az staticwebapp appsettings list \
  --name wheelofdoom-swa \
  --resource-group rg-wheelofdoom-prod
```

**Check Tables**:
```bash
az storage table list --account-name wheelodomstorage --output table
```

**Test Endpoints**:
```bash
# Should redirect to Azure AD login (401 or 302)
curl -I https://wheelofdoom-swa.azurestaticapps.net

# After authentication, test API
curl https://wheelofdoom-swa.azurestaticapps.net/api/entries \
  -H "Cookie: StaticWebAppsAuthCookie=..."
```

### Cost Monitoring

**Monthly Budget**: $10-15
- Azure Static Web Apps Standard: $9/month
- Azure Functions: $0-1/month (consumption tier)
- Azure Storage: $1-5/month
- Azure Key Vault: ~$0.03/month (minimal operations)

**Set Budget Alert**:
```bash
az consumption budget create \
  --resource-group rg-wheelofdoom-prod \
  --name "WheelOfDoom-Monthly-Budget" \
  --amount 20 \
  --time-grain Monthly
```

### Troubleshooting Deployment

**Deployment workflow fails**:
- Check GitHub Actions logs for specific error
- Verify all 7 GitHub secrets are configured
- Ensure service principal has Contributor role

**Infrastructure deployment fails**:
- Storage account name must be globally unique (3-24 chars, lowercase/numbers)
- Check Azure CLI version: `az --version`
- Verify resource group exists

**App settings not configured**:
- Manually set via Azure Portal → Static Web App → Configuration
- Or run the `az staticwebapp appsettings set` command from workflow

**Authentication fails**:
- Verify `<TENANT_ID>` in `staticwebapp.config.json` is correct
- Check redirect URI is configured in Azure AD app registration
- Ensure `AAD_CLIENT_ID` and `AAD_CLIENT_SECRET` are set in app settings

**API returns 500 errors**:
- Check Application Insights logs in Azure Portal
- Verify `ConnectionStrings__tables` is set correctly
- Test storage connection: Azure Portal → Storage Account → Tables

**Tables not created**:
- Tables are auto-created by Bicep template
- Verify via Azure Portal → Storage Account → Tables
- Or use Azure Storage Explorer

### Rollback Strategy

**Revert Code**:
```bash
git revert HEAD
git push origin master  # Triggers automatic redeployment
```

**Rollback Infrastructure**:
```bash
# Re-deploy previous working Bicep template
az deployment group create \
  --resource-group rg-wheelofdoom-prod \
  --template-file infra/main.bicep.backup
```

**Emergency Stop**:
```bash
# Disable automatic deployments
# Comment out 'push:' trigger in .github/workflows/azure-deploy.yml
# Keep 'workflow_dispatch:' for manual control
```

### Local vs Production Differences

**Same**:
- Backend code (zero changes required!)
- Frontend code
- API contracts
- Table Storage schema

**Different**:
- Authentication (anonymous vs Azure AD)
- Storage backend (Azurite vs Azure Table Storage)
- Hosting (Aspire orchestration vs Static Web Apps)
- Observability (Aspire Dashboard vs Application Insights)

**Key Takeaway**: Configuration-driven architecture allows same codebase to run in both environments without conditional logic.

## Important Gotchas

### Aspire Port Mapping Issues
If Aspire dashboard shows the service but accessing it hangs:
- Ensure Vite server has `host: '0.0.0.0'` in config (not `localhost`)
- Verify `process.env.PORT` is being read and applied
- Check that proxy target reads `process.env.services__api__http__0`

### Azure Functions CORS in Development
No manual CORS configuration needed locally - Vite's proxy handles all `/api/*` requests. In production, Azure Static Web Apps handles routing.

### Table Storage Query Performance
- Single partition ("wheel") is fine for small teams (<1000 entries)
- Inverted timestamp RowKey eliminates need for LINQ `.OrderByDescending()`
- Azurite connection string: `UseDevelopmentStorage=true`
- Real Azure connection string goes in `AzureWebJobsStorage` app setting

### React State Management
- Hooks automatically refetch after mutations (add/delete entry, save result)
- Loading states prevent race conditions during API calls
- Error states are preserved until next successful operation

### Frontend Build Output
- Vite outputs to `src/app/dist` (not root `dist`)
- Azure Static Web Apps expects "Output location" = `dist` (relative to App location)
- Ensure `.gitignore` excludes `dist/` to prevent committing build artifacts

## Debugging Common Issues

**"Add names to spin!" message**: No entries in database - use EntryList UI to add names

**API 404 errors**: Functions not running - check `func start` output, verify port 7071

**Azurite connection failures**:
- Verify Azurite running on ports 10000-10002
- Check `local.settings.json` has `AzureWebJobsStorage: "UseDevelopmentStorage=true"`
- Use Azure Storage Explorer to inspect tables

**Wheel doesn't spin**: Check browser console for Canvas/animation errors

**No sound**: Browser autoplay policy blocks audio without user interaction - ensure audio context starts after user click

**Aspire frontend hangs**: Vite must bind to `0.0.0.0`, not `localhost` - see Aspire configuration section

## Technology Stack

- **Frontend**: React 19.2, Vite 7.2.4, Vitest 4.0.17
- **Backend**: .NET 10 (API with Aspire integration), Azure Functions v4 (isolated worker)
- **Storage**: Azure.Data.Tables 12.11.0
- **Orchestration**: .NET Aspire 13.1.0
- **Testing**: xUnit (.NET), Vitest + Testing Library (React), Playwright (E2E)
- **CI/CD**: GitHub Actions with Claude Code integration

## Additional Documentation

- **README.md**: Quick start, prerequisites, project structure
- **spec.md**: Detailed feature specification, architecture diagram, data models
- Inline code comments focus on non-obvious logic (Web Audio, inverted timestamps, etc.)

---

*Last updated: 2026-01-26*
