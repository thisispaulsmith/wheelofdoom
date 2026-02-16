# Wheel of Doom - Frontend

React + Vite frontend for the Wheel of Doom team task assignment app.

## Features

- **Animated Spinning Wheel**: Canvas-based wheel animation with 60fps rendering and ~7 second spin duration
- **Sound Effects**: Web Audio API synthesized sounds (tick, drumroll, fanfare)
- **User Profile Photos**: Displays authenticated user's Entra ID (Azure AD) profile photo in header
- **Entry Management**: Add/remove team members with persistent storage
- **Spin History**: Tabbed statistics view showing recent spin results and cumulative stats
- **Azure AD Authentication**: Secure authentication via Azure Static Web Apps

## Tech Stack

- **React 19.2** - UI framework
- **Vite 7.2.4** - Build tool and dev server
- **Vitest 4.0.17** - Unit testing
- **Canvas API** - Wheel rendering and animation
- **Web Audio API** - Sound synthesis
- **Azure Static Web Apps** - Hosting and authentication

## Project Structure

```
src/app/
├── src/
│   ├── components/          # React components
│   │   ├── Wheel.jsx       # Animated spinning wheel (Canvas)
│   │   ├── EntryList.jsx   # Manage wheel entries
│   │   ├── HistoryTabs.jsx # Statistics and history display
│   │   ├── WinnerModal.jsx # Winner announcement
│   │   └── UserProfile.jsx # User profile photo display
│   ├── hooks/              # Custom React hooks
│   │   ├── useEntries.js   # Entry CRUD operations
│   │   ├── useResults.js   # Spin history management
│   │   ├── useSound.js     # Web Audio synthesis
│   │   └── useAuth.js      # User authentication state
│   ├── utils/              # Utility functions
│   │   ├── api.js          # API client (fetch wrappers)
│   │   └── telemetry.js    # Application Insights integration
│   ├── App.jsx             # Main application component
│   ├── App.css             # Application styles
│   └── main.jsx            # Application entry point
├── public/                 # Static assets
├── vite.config.js          # Vite configuration
└── package.json            # Dependencies and scripts
```

## Development

### Start Dev Server

```bash
# From repository root (using Aspire - recommended)
cd src/AppHost
dotnet run

# Or from src/app directory (manual)
npm run dev
```

### Run Tests

```bash
# From repository root
npm run test:app              # Run once
npm run test:app:watch        # Watch mode
```

### Build for Production

```bash
npm run build                 # Outputs to dist/
```

## Key Components

### Wheel.jsx

Canvas-based wheel rendering with smooth animation:
- **Rendering**: 60fps requestAnimationFrame loop
- **Physics**: Easing function for natural deceleration
- **Callbacks**: `onSpinStart`, `onSpinComplete`, `onTick`
- **Responsive**: Automatically scales to container size

### UserProfile.jsx

Displays user profile photo with fallback:
- **Authenticated Users**: Fetches photo from `/api/user/photo` endpoint
- **Anonymous Users**: Shows anonymous avatar icon
- **Loading State**: Displays pulsing placeholder while loading
- **Error Handling**: Graceful fallback to anonymous avatar if photo fetch fails

### EntryList.jsx

Entry management with optimistic UI updates:
- **Add Entry**: Input validation and duplicate prevention
- **Delete Entry**: Confirmation and error handling
- **Loading States**: Disabled UI during API calls
- **Error Messages**: User-friendly error display

### HistoryTabs.jsx

Statistics display with tabbed interface:
- **Recent Results**: Last 50 spin results with timestamps
- **Statistics**: Pie chart showing cumulative spin counts per person
- **Responsive**: Adapts to mobile and desktop layouts

## API Integration

All API calls are centralized in `src/utils/api.js`:

```javascript
// Entries
export async function fetchEntries()
export async function addEntry(name)
export async function deleteEntry(name)

// Results
export async function fetchResults()
export async function saveResult(name)

// User Authentication
export async function fetchUserInfo()
```

API utilities use relative paths (`/api/*`) which are:
- **Development**: Proxied to `http://localhost:7071` by Vite
- **Production**: Routed to Azure Functions by Azure Static Web Apps

## Authentication

### Production (Azure Static Web Apps)

- Configured in `staticwebapp.config.json`
- All routes require `authenticated` role
- Unauthenticated requests redirect to `/.auth/login/aad`
- User identity available via `/.auth/me` endpoint
- User profile photo fetched via backend proxy (`/api/user/photo`)

### Local Development

- **Aspire Mode** (default): No authentication, anonymous user
- **SWA CLI Mode** (optional): Simulates authentication with test user

**SWA CLI Mode**:
```bash
# Terminal 1: Start Aspire services
cd src/AppHost
dotnet run

# Terminal 2: Start SWA CLI
npm run dev:with-auth
```

Access at: http://localhost:4280

## Configuration

### Vite Config (`vite.config.js`)

```javascript
export default defineConfig({
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    host: '0.0.0.0',  // Required for Aspire
    proxy: {
      '/api': {
        target: process.env.services__api__http__0 || 'http://localhost:7071',
        changeOrigin: true,
      }
    }
  }
})
```

**Key Settings**:
- `host: '0.0.0.0'` - Required for Aspire orchestration
- `proxy['/api']` - Routes API requests to backend
- `process.env.services__api__http__0` - Aspire-provided API URL

### Static Web App Config (`staticwebapp.config.json`)

Located at repository root, copied to `dist/` during build:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
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
  ]
}
```

**Copy Mechanism**: Vite build automatically copies `staticwebapp.config.json` to `dist/` using custom plugin (see `vite.config.js`).

## Sound System

Web Audio API synthesized sounds (no external files):

### Tick Sound
- **Frequency**: 800Hz sine wave
- **Duration**: 50ms
- **Trigger**: Each wheel segment crossing

### Drumroll
- **Pattern**: Accelerating oscillations (100ms → 30ms intervals)
- **Frequency**: Low-frequency noise
- **Duration**: ~7 seconds (wheel spin duration)

### Fanfare
- **Pattern**: Chord progression (C-E-G)
- **Duration**: 2 seconds with gain envelope
- **Trigger**: Winner announcement

**Browser Compatibility**: Audio context requires user interaction before starting (autoplay policy).

## Testing

Frontend tests use Vitest + React Testing Library:

```
test/app/
├── components/          # Component tests
│   ├── EntryList.test.jsx
│   ├── HistoryTabs.test.jsx
│   └── Wheel.test.jsx
├── hooks/              # Hook tests
│   ├── useEntries.test.js
│   └── useResults.test.js
└── utils/              # Utility tests
    └── api.test.js
```

**Test Coverage**: 53 unit and component tests

## Performance

- **Wheel Animation**: 60fps via requestAnimationFrame
- **API Caching**: Backend photo endpoint sets `Cache-Control: max-age=3600`
- **Lazy Loading**: Chart.js loaded only when statistics tab is active
- **Bundle Size**: ~250KB (gzipped)

## Troubleshooting

### "Add names to spin!" message
No entries in database. Use EntryList UI to add names.

### Wheel doesn't spin
Check browser console for Canvas/animation errors. Ensure entries exist.

### No sound
Browser autoplay policy blocks audio without user interaction. Audio context starts on first user click.

### Profile photo not showing
- **Local Dev (Aspire)**: Expected behavior (anonymous user)
- **Local Dev (SWA CLI)**: Backend returns 404 for test user (expected)
- **Production**: Check Azure AD permissions (`User.Read.All`) and Function App environment variables

### API 404 errors
Backend not running. Start with `dotnet run` (Aspire) or `func start` (manual).

## Deployment

### Production Build

```bash
npm run build
```

Outputs to `dist/` with:
- Minified JavaScript bundles
- Optimized CSS
- Static assets
- `staticwebapp.config.json` (copied from root)

### Azure Static Web Apps Deployment

Automatic deployment via GitHub Actions (`.github/workflows/azure-deploy.yml`):

1. Builds frontend: `npm run build`
2. Deploys to Azure Static Web Apps
3. Linked Function App backend provides API

**Deployment Settings**:
- App location: `src/app`
- Output location: `dist`
- API location: `src/api`

## Contributing

When adding new features:

1. **Components**: Add to `src/components/` with corresponding tests in `test/app/components/`
2. **Hooks**: Add to `src/hooks/` with tests in `test/app/hooks/`
3. **API Endpoints**: Add utility function to `src/utils/api.js` and wrap with custom hook
4. **Tests**: Maintain test coverage for all new code

## License

MIT
