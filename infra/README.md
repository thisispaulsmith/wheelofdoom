# Infrastructure as Code

This directory contains Bicep templates for provisioning Azure resources for the Wheel of Doom application.

## Prerequisites

- Azure CLI installed (`az --version` to verify)
- Logged in to Azure (`az login`)
- Appropriate permissions to create resources in the subscription
- Resource group created (`rg-wheelofdoom`)

## Resources Overview

The Bicep template (`main.bicep`) provisions the following Azure resources:

1. **Azure Static Web App** (`swa-wheelofdoom`)
   - SKU: Standard tier
   - Hosts React frontend (Vite build output)
   - Hosts .NET Azure Functions backend (managed)
   - Integrated SSL, CDN, and custom domains
   - Azure AD authentication via `staticwebapp.config.json`

2. **Storage Account** (`stowheelofdoom`)
   - SKU: Standard LRS (Locally Redundant Storage)
   - Type: StorageV2
   - TLS 1.2 minimum
   - Public blob access disabled
   - Used for Azure Table Storage

3. **Table Service**
   - Entries table: Stores wheel entries (PartitionKey: "wheel", RowKey: person name)
   - Results table: Stores spin results (PartitionKey: "wheel", RowKey: inverted timestamp)

4. **Azure Function App** (`func-wheelofdoom`)
   - Flex Consumption plan (Linux)
   - .NET 10 isolated worker runtime
   - Integrated with Static Web App as linked backend
   - Connection strings configured directly in app settings

## Manual Deployment

### Step 1: Create Resource Group

```bash
az group create \
  --name rg-wheelofdoom \
  --location eastus
```

### Step 2: Update Parameters

Edit `main.bicepparam` and replace placeholders:
- `tenantId` - Your Azure AD tenant ID (find at portal.azure.com → Azure Active Directory → Overview)
- `storageAccountName` - Must be globally unique (3-24 chars, lowercase/numbers only)

### Step 3: Grant Service Principal Required Permissions (One-Time Setup)

The GitHub Actions service principal needs Contributor role on the resource group to deploy infrastructure.

**Grant Permissions:**
```bash
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-wheelofdoom
```

**Verify Permissions:**
```bash
az role assignment list \
  --assignee <AZURE_CLIENT_ID> \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-wheelofdoom \
  --output table
```

### Step 4: Deploy Infrastructure

The deployment now requires passing AAD credentials as secure parameters:

```bash
az deployment group create \
  --resource-group rg-wheelofdoom \
  --template-file main.bicep \
  --parameters main.bicepparam \
  --parameters aadClientId='<your-aad-client-id>' aadClientSecret='<your-aad-client-secret>'
```

**What happens during deployment:**
1. Creates Azure Static Web App, Storage Account, and Function App
2. Creates Entries and Results tables
3. Builds storage connection string using `listKeys()` and configures app settings
4. Stores AAD client ID and secret directly in Static Web App app settings
5. Links Function App as backend to Static Web App
6. **All configuration is atomic** - no manual steps required!

### Step 5: Verify Deployment

```bash
# List all resources in the resource group
az resource list \
  --resource-group rg-wheelofdoom \
  --output table

# Check Static Web App details
az staticwebapp show \
  --name swa-wheelofdoom \
  --resource-group rg-wheelofdoom

# Check Storage Account tables
az storage table list \
  --account-name stowheelofdoom \
  --output table
```

## GitHub Actions Integration

The project includes automated CI/CD workflows for infrastructure deployment and validation.

### Workflow Architecture

```
Pull Request
│
├─> pr-tests.yml (run all tests including E2E)
├─> pr-app-deploy.yml (test + deploy to staging)
└─> pr-infrastructure-validate.yml (validate infra if infra/** modified)

Merge to Master
│
├─> app-deploy.yml (deploy app if src/** changed)
└─> infrastructure-deploy.yml (deploy infra if infra/** changed)
```

### Application Deployment (Production)

**Workflow:** `.github/workflows/app-deploy.yml`

**Triggers:**
- Push to `master` when `src/**` files change
- Manual via `workflow_dispatch`

**Process:**
1. Run frontend tests (Vitest - 53 tests)
2. Run backend tests (xUnit - 19 tests)
3. Build frontend (React + Vite → dist/)
4. Build backend (.NET Azure Functions → publish/)
5. Deploy to Azure Static Web Apps production
6. Run smoke tests to verify deployment

**Required GitHub Secret:**
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web App deployment token

**How to Retrieve Deployment Token:**

Option A: Azure CLI
```bash
az staticwebapp secrets list \
  --name swa-wheelofdoom \
  --resource-group rg-wheelofdoom \
  --query "properties.apiKey" \
  --output tsv
```

Option B: Azure Portal
1. Navigate to: Resource Groups → rg-wheelofdoom → swa-wheelofdoom
2. Go to: Settings → Deployment tokens
3. Copy the deployment token value

Then add to GitHub: Settings → Secrets and variables → Actions → New repository secret
- Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Value: [paste token]

### PR Preview Deployment

**Workflow:** `.github/workflows/pr-app-deploy.yml`

**Triggers:** Pull requests modifying `src/**` files

**Process:**
1. Run frontend and backend tests
2. Build frontend and backend
3. Deploy to Azure Static Web Apps staging environment
4. Post preview URL as PR comment
5. Automatically clean up staging environment when PR closes

**Staging Environment:**
- Each PR gets a unique staging URL
- Uses same Azure AD authentication as production
- Automatically deleted when PR is closed or merged
- No additional cost on Standard tier

### Infrastructure Deployment (Production)

**Workflow:** `.github/workflows/infrastructure-deploy.yml`

**Triggers:**
- Push to `master` when `infra/**` files change
- Manual via `workflow_dispatch`

**Process:**
1. Runs what-if analysis to preview changes
2. Deploys Bicep template to Azure
3. Verifies infrastructure (Static Web App, Storage)
4. Outputs deployment summary

**Required GitHub Secrets:**
1. `AZURE_CLIENT_ID` - Service principal client ID
2. `AZURE_TENANT_ID` - Azure AD tenant ID
3. `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
4. `AAD_CLIENT_ID` - Azure AD app registration client ID (for user authentication)
5. `AAD_CLIENT_SECRET` - Azure AD app registration client secret (for user authentication)
6. `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web App deployment token (see Application Deployment section above)

**Required Permissions:** Contributor (see Step 3)

### PR Infrastructure Validation

**Workflow:** `.github/workflows/pr-infrastructure-validate.yml`

**Triggers:** PRs modifying `infra/**` files

**Process:**
1. Lints Bicep templates
2. Validates template structure
3. Runs `az deployment group what-if` to preview changes
4. Posts results as PR comment

**Required Permissions:** Contributor

### PR Testing

**Workflow:** `.github/workflows/pr-tests.yml`

**Triggers:** All pull requests

**Process:**
1. Runs frontend tests (Vitest)
2. Runs backend tests (xUnit)
3. Reports test results

**Required Permissions:** None (runs on GitHub-hosted runners without Azure access)

### Permission Summary

Infrastructure workflows use the same service principal configured in GitHub Secrets (`AZURE_CLIENT_ID`). The permissions granted in **Step 3** enable all infrastructure workflows.

## Configuration After Deployment

### 1. How Secrets Are Managed (Fully Automated)

**All secrets and configuration are managed entirely in Bicep** - no manual configuration or workflow steps required!

**What Bicep Does Automatically:**

1. **Storage Connection String** - Built directly in Bicep:
   - Uses `listKeys()` to retrieve storage account key
   - Constructs connection string and stores in Function App app settings
   - Never exposed in outputs or deployment history

2. **AAD Credentials** - Passed as secure parameters:
   - `aadClientId` and `aadClientSecret` passed via `@secure()` parameters
   - Stored directly in Static Web App app settings
   - `@secure()` decorator masks values in deployment history

3. **Function App Settings** - Configured with direct connection strings:
   - `AzureWebJobsStorage` - Storage connection for Functions runtime
   - `DEPLOYMENT_STORAGE_CONNECTION_STRING` - For flex consumption deployment
   - `ConnectionStrings__tables` - Table Storage for application data
   - `AZURE_TENANT_ID` - Azure AD tenant ID for Microsoft Graph API access
   - `AZURE_CLIENT_ID` - Azure AD client ID for Microsoft Graph API access
   - `AZURE_CLIENT_SECRET` - Azure AD client secret for Microsoft Graph API access

4. **Static Web App Settings** - Configured with direct secrets:
   - `AAD_CLIENT_ID` - Azure AD client ID for user authentication
   - `AAD_CLIENT_SECRET` - Azure AD client secret

**Verify Configuration:**
```bash
# Check Static Web App settings
az staticwebapp appsettings list \
  --name swa-wheelofdoom \
  --resource-group rg-wheelofdoom

# Check Function App settings
az functionapp config appsettings list \
  --name func-wheelofdoom \
  --resource-group rg-wheelofdoom
```

**Security Benefits:**
- ✅ **Single source of truth** - All configuration in Bicep
- ✅ **No secrets in outputs** - Secrets never exposed in deployment history
- ✅ **No workflow steps** - Everything configured during deployment
- ✅ **Atomic deployment** - Settings deployed with infrastructure
- ✅ **Secure parameters** - `@secure()` masks values in history
- ✅ **Platform security** - Azure encrypts app settings at rest and in transit

**Security Trade-offs:**
- Secrets stored in app settings (Azure platform security) rather than Key Vault
- No Key Vault audit logging for secret access
- Secret rotation requires updating app settings directly

**Important**: `ConnectionStrings__tables` matches Aspire's expected configuration format, allowing the backend code to work unchanged in both development (Aspire) and production (Azure Static Web Apps).

### 2. Configure Azure AD App Registration

The application requires an Azure AD app registration with Microsoft Graph API permissions.

**Required Setup**:
1. Create Azure AD app registration (if not exists)
2. Configure API permissions: `User.Read.All` (Application permission)
3. Grant admin consent for Microsoft Graph API
4. Create client secret
5. Configure redirect URI: `https://<static-web-app-name>.azurestaticapps.net/.auth/login/aad/callback`

**Detailed Instructions**: See the "Azure AD App Registration Setup" section in the main [README.md](../README.md#azure-ad-app-registration-setup) for step-by-step instructions.

**Why This Is Needed**:
- User authentication via Azure AD (configured in `staticwebapp.config.json`)
- User profile photo fetching via Microsoft Graph API (backend Function)
- The Function App uses application permissions to fetch photos on behalf of authenticated users

## Deployment Outputs

The Bicep template outputs the following values (useful for CI/CD):

- `staticWebAppDefaultHostName` - URL of the deployed app
- `staticWebAppId` - Resource ID
- `staticWebAppName` - Resource name
- `functionAppName` - Function App name
- `functionAppDefaultHostName` - Function App URL
- `functionAppId` - Function App resource ID
- `storageAccountName` - Storage account name
- `storageAccountId` - Storage account resource ID
- `tableEndpoint` - Table storage endpoint

**Note**: Secrets (connection strings, AAD credentials) are NOT output for security reasons. They are stored securely in app settings by the Bicep template.

View outputs:

```bash
az deployment group show \
  --resource-group rg-wheelofdoom \
  --name <deployment-name> \
  --query properties.outputs
```

## Cost Monitoring

**Estimated Monthly Cost**: $10-15
- Azure Static Web Apps (Standard): $9/month
- Azure Storage (Table Storage): $1-5/month
- Azure Functions (Flex Consumption): $0-1/month (within free tier)

### Set Up Budget Alert

```bash
az consumption budget create \
  --resource-group rg-wheelofdoom \
  --name "WheelOfDoom-Monthly-Budget" \
  --amount 20 \
  --time-grain Monthly \
  --time-period start-date=2026-02-01 \
  --notifications \
    name=ActualCost \
    enabled=true \
    operator=GreaterThan \
    threshold=80 \
    contact-emails=your-email@example.com
```

### View Current Costs

```bash
az consumption usage list \
  --resource-group rg-wheelofdoom \
  --start-date 2026-01-01 \
  --end-date 2026-01-31
```

## Cleanup

To delete all resources (destructive operation):

```bash
az group delete \
  --name rg-wheelofdoom \
  --yes \
  --no-wait
```

## Troubleshooting

### Deployment Fails: "Storage account name already taken"

Storage account names must be globally unique. Update `storageAccountName` in `main.bicepparam` to a different value.

### Deployment Fails: "Authorization failed"

Ensure your Azure CLI session or service principal has appropriate permissions:

**For manual deployment (Azure CLI):**
```bash
az role assignment create \
  --assignee <your-user-principal-name> \
  --role Contributor \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-wheelofdoom
```

**For GitHub Actions deployment:**
See **Step 3** for required service principal permissions.

### Static Web App Shows 500 Error

Check that app settings are configured correctly, especially `ConnectionStrings__tables`.

### Azure AD Authentication Not Working

1. Verify tenant ID in `staticwebapp.config.json` or environment variables
2. Verify redirect URI is configured in Azure AD app registration
3. Check AAD_CLIENT_ID and AAD_CLIENT_SECRET are set in app settings

## Additional Resources

- [Azure Static Web Apps documentation](https://learn.microsoft.com/azure/static-web-apps/)
- [Bicep documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure Table Storage documentation](https://learn.microsoft.com/azure/storage/tables/)
- [Azure CLI reference](https://learn.microsoft.com/cli/azure/)

---

*Last updated: 2026-02-13*
