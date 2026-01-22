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

The frontend accesses the API through environment variables set by Aspire:
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
- `src/api/Program.cs` - Dependency injection setup, registers `ITableStorageService`
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
- **Backend**: .NET 8 (API), .NET 10 (Aspire), Azure Functions v4 (isolated worker)
- **Storage**: Azure.Data.Tables 12.11.0
- **Orchestration**: .NET Aspire 13.1.0
- **Testing**: xUnit (.NET), Vitest + Testing Library (React), Playwright (E2E)
- **CI/CD**: GitHub Actions with Claude Code integration

## Additional Documentation

- **README.md**: Quick start, prerequisites, project structure
- **spec.md**: Detailed feature specification, architecture diagram, data models
- Inline code comments focus on non-obvious logic (Web Audio, inverted timestamps, etc.)

---

*Last updated: 2026-01-22*
