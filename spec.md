# Wheel of Doom - Specification

## Overview

A shared team web app that randomly selects a person from a list using an animated spinning wheel. Designed for fun task assignment with dramatic flair.

## Core Features

### 1. The Wheel
- Colorful spinning wheel with names on segments
- Click wheel or press key to spin
- Dramatic spin animation with suspenseful slowdown
- Pointer indicates the winner

### 2. Name Management
- Single shared list for all users
- Add/remove names via simple text input
- Any authenticated user can edit
- Names persist in backend

### 3. Results History
- View-only log of all spins
- Shows: selected name + when + who spun
- Displayed in sidebar, newest first

### 4. Fun Elements
- **Sounds**: Web Audio API synthesized sounds (no external files needed)
  - Tick: Short click sound for each wheel segment
  - Drumroll: Accelerating low-frequency rumble during spin
  - Fanfare: Triumphant chord progression on winner selection
- **Animations**: Confetti burst, winner spotlight/highlight
- **Messages**: Random dramatic announcements ("The Wheel has spoken!", "Fate has decided...", "Today's victim is...")

## Technical Architecture

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) |
| Backend | Azure Functions (.NET 8, isolated worker) |
| Storage | Azure Table Storage |
| Auth | Azure AD (single tenant) |
| Hosting | Azure Static Web App |

```
┌─────────────────────────────────────────────────┐
│         Azure Static Web App                    │
│  ┌───────────────────────────────────────────┐  │
│  │  Frontend (React)                         │  │
│  │  - Wheel animation (Canvas)               │  │
│  │  - Sound effects                          │  │
│  │  - UI for names & results                 │  │
│  └───────────────────────────────────────────┘  │
│                      │                          │
│  ┌───────────────────▼───────────────────────┐  │
│  │  Azure Functions (.NET 8)                 │  │
│  │  - GET/POST/DELETE /api/entries           │  │
│  │  - GET/POST /api/results                  │  │
│  └───────────────────┬───────────────────────┘  │
└──────────────────────│──────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │  Azure Table Storage      │
         │  - Entries table          │
         │  - Results table          │
         └───────────────────────────┘
```

## Folder Structure

```
/
├── staticwebapp.config.json
├── spec.md
├── src/
│   ├── AppHost/                       # .NET Aspire orchestration
│   ├── ServiceDefaults/               # Aspire shared config
│   ├── app/                           # React frontend
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.jsx
│   │       ├── App.jsx
│   │       ├── App.css
│   │       ├── components/
│   │       │   ├── Wheel.jsx
│   │       │   ├── Wheel.css
│   │       │   ├── EntryList.jsx
│   │       │   ├── EntryList.css
│   │       │   ├── Results.jsx
│   │       │   ├── Results.css
│   │       │   └── WinnerModal.jsx
│   │       ├── hooks/
│   │       │   ├── useEntries.js
│   │       │   ├── useResults.js
│   │       │   └── useSound.js
│   │       └── utils/
│   │           └── api.js
│   │
│   └── api/                           # .NET Azure Functions
│       ├── WheelOfDoom.Api.csproj
│       ├── Program.cs
│       ├── host.json
│       ├── local.settings.json
│       ├── Functions/
│       │   ├── EntriesFunction.cs
│       │   ├── EntryDeleteFunction.cs
│       │   └── ResultsFunction.cs
│       ├── Models/
│       │   ├── Entry.cs
│       │   ├── SpinResult.cs
│       │   └── ApiResponse.cs
│       └── Services/
│           ├── ITableStorageService.cs
│           └── TableStorageService.cs
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List all names |
| POST | `/api/entries` | Add a name `{ "name": "Paul" }` |
| DELETE | `/api/entries/{name}` | Remove a name |
| GET | `/api/results` | Get spin history |
| POST | `/api/results` | Record a spin `{ "name": "Paul" }` |

## Data Model

### Entries Table

| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | Always "wheel" |
| RowKey | string | The person's name |
| AddedBy | string | User email/id who added |
| Timestamp | DateTimeOffset | When added |

### Results Table

| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | Always "wheel" |
| RowKey | string | Inverted timestamp (for newest-first sorting) |
| SelectedName | string | Name that was selected |
| SpunBy | string | User email/id who spun |
| SpunAt | DateTimeOffset | When the spin occurred |

## UI Wireframe

```
┌────────────────────────────────────────────────────────┐
│  🎡 Wheel of Doom                        [User ▼]      │
├──────────────────────────────┬─────────────────────────┤
│                              │ Entries (7)             │
│                              │ ───────────────────     │
│       ╭─────────────╮        │ Callum            [x]   │
│      ╱   spinning    ╲       │ Jordan            [x]   │
│     │     wheel       │      │ Dan               [x]   │
│      ╲   with names  ╱       │ Will              [x]   │
│       ╰─────────────╯        │ Paul              [x]   │
│            ▲                 │ ───────────────────     │
│         pointer              │ [____________] [Add]    │
│                              ├─────────────────────────┤
│   "Click to spin!"           │ Recent Results          │
│                              │ ───────────────────     │
│                              │ Paul - 2 mins ago       │
│                              │ Dan - 1 hour ago        │
│                              │ Jordan - yesterday      │
└──────────────────────────────┴─────────────────────────┘
```

## Authentication

Uses Azure Static Web Apps built-in authentication with Azure AD.

### staticwebapp.config.json

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad"
    }
  },
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

## Local Development

### Using .NET Aspire (Recommended)

```bash
cd src/AppHost && dotnet run
```

This starts:
- Azurite storage emulator
- Azure Functions API
- React frontend
- Aspire Dashboard (observability)

### Manual Start

```bash
# Frontend (from repo root)
cd src/app && npm install && npm run dev    # Runs on :5173

# Backend (from repo root)
cd src/api && func start                     # Runs on :7071
```

## Build & Deploy

```bash
# Frontend build
cd src/app && npm run build                  # Outputs to src/app/dist

# Backend build
cd src/api && dotnet publish -c Release
```

### Azure Static Web App Configuration

| Setting | Value |
|---------|-------|
| App location | `src/app` |
| Output location | `dist` |
| API location | `src/api` |

## Key Decisions

| Aspect | Decision |
|--------|----------|
| Wheels | Single shared team wheel |
| Auth | Azure AD, single tenant |
| Permissions | Anyone can spin, add, or remove names |
| History | View-only, persisted |
| Storage | Azure Table Storage |
| Fun factor | Sounds + animations + funny messages |
| Frontend | React with Vite |
| Backend | .NET 8 Azure Functions (isolated worker) |
