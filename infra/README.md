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

4. **Azure Key Vault** (`kv-wheelofdoom`)
   - SKU: Standard tier
   - RBAC-enabled for access control
   - Soft delete enabled (7-day retention)
   - Stores sensitive secrets (connection strings, client secrets)
   - Prevents secret exposure in logs and deployment history
   - **Automated**: Bicep creates secret resource with storage connection string (never exposed in outputs)

## Manual Deployment

### Step 1: Create Resource Group

```bash
az group create \
  --name rg-wheelofdoom \
  --location eastus
```

### Step 2: Update Parameters

Edit `main.bicepparam` and replace placeholders:
- `<YOUR_TENANT_ID>` - Your Azure AD tenant ID (find at portal.azure.com → Azure Active Directory → Overview)
- `<GITHUB_ACTIONS_SP_OBJECT_ID>` - Service principal object ID for GitHub Actions (see below)

**Get GitHub Actions Service Principal Object ID:**
```bash
# If using federated credentials (recommended)
az ad sp show --id <AZURE_CLIENT_ID> --query id -o tsv

# Or by display name
az ad sp list --display-name "WheelOfDoom-GitHub-Deploy" --query "[0].id" -o tsv
```

**Note**: This is the **object ID** (not client ID) of the service principal used by GitHub Actions.

### Step 3: Grant Service Principal Required Permissions (One-Time Setup)

The GitHub Actions service principal needs specific RBAC roles on the resource group to deploy infrastructure and manage role assignments.

**Required Roles:**
- **Contributor** - Deploy and manage Azure resources
- **User Access Administrator** - Create role assignments (required for Key Vault RBAC in Bicep)

**Why User Access Administrator is needed:**
The Bicep template (`main.bicep` lines 151-159) creates a `Microsoft.Authorization/roleAssignments` resource to grant the service principal access to Key Vault secrets. To create role assignments, the service principal needs the User Access Administrator role.

**Grant Permissions:**

Option 1: Two Separate Roles (Recommended - Principle of Least Privilege)
```bash
# Grant Contributor role
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-wheelofdoom

# Grant User Access Administrator role
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role "User Access Administrator" \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-wheelofdoom
```

Option 2: Single Owner Role (Simpler but More Permissions)
```bash
# Owner includes both Contributor and User Access Administrator
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role Owner \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-wheelofdoom
```

**Verify Permissions:**
```bash
az role assignment list \
  --assignee <AZURE_CLIENT_ID> \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-wheelofdoom \
  --output table
```

**Important: Bicep vs. Manual Permission Grant**

The Bicep template grants **application-level permissions** (Key Vault Secrets Officer) but **cannot grant deployment permissions** due to a circular dependency:
- ✅ Bicep grants: Key Vault access for runtime operations
- ❌ Bicep cannot grant: Deployment permissions for the service principal itself

You must grant Contributor + User Access Administrator manually as a one-time setup step.

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
1. Creates Azure Static Web App, Storage Account, and Key Vault
2. Creates Entries and Results tables
3. Stores storage connection string in Key Vault (using `listKeys()` - safe in secret resource)
4. Stores AAD client ID and secret in Key Vault
5. Grants GitHub Actions service principal Key Vault Secrets Officer role
6. Configures Static Web App settings with Key Vault references
7. **All configuration is atomic** - no manual steps required!

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
├─> pr-tests.yml (run frontend & backend tests)
└─> pr-infrastructure-validate.yml (validate infra changes if infra/** modified)

Merge to Master
│
└─> infrastructure-deploy.yml (deploy infra if infra/** changed)
```

**Note**: Application deployment (frontend/backend) is currently manual. Automated application deployment workflows may be added in the future.

### Infrastructure Deployment (Production)

**Workflow:** `.github/workflows/infrastructure-deploy.yml`

**Triggers:**
- Push to `master` when `infra/**` files change
- Manual via `workflow_dispatch`

**Process:**
1. Runs what-if analysis to preview changes
2. Deploys Bicep template to Azure
3. Verifies infrastructure (Static Web App, Key Vault, Storage)
4. Outputs deployment summary

**Required GitHub Secrets:**
1. `AZURE_CLIENT_ID` - Service principal client ID
2. `AZURE_TENANT_ID` - Azure AD tenant ID
3. `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
4. `AAD_CLIENT_ID` - Azure AD app registration client ID (for user authentication)
5. `AAD_CLIENT_SECRET` - Azure AD app registration client secret (for user authentication)

**Required Permissions:** Contributor + User Access Administrator (see Step 3)

### PR Infrastructure Validation

**Workflow:** `.github/workflows/pr-infrastructure-validate.yml`

**Triggers:** PRs modifying `infra/**` files

**Process:**
1. Lints Bicep templates
2. Validates template structure
3. Runs `az deployment group what-if` to preview changes
4. Posts results as PR comment

**Required Permissions:** Contributor + User Access Administrator

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

**All secrets are now managed entirely in Bicep** - no manual configuration or workflow steps required!

**What Bicep Does Automatically:**

1. **Storage Connection String** - Created via Key Vault secret resource:
   - Uses `listKeys()` to retrieve storage account key
   - Stored encrypted in Key Vault as `storage-connection-string`
   - **Safe because it's in a secret resource** (not in outputs)

2. **AAD Credentials** - Passed as secure parameters and stored in Key Vault:
   - `aadClientId` → Key Vault secret `aad-client-id`
   - `aadClientSecret` → Key Vault secret `aad-client-secret`
   - `@secure()` decorator masks values in deployment history

3. **RBAC Permissions** - GitHub Actions service principal granted Key Vault access:
   - Role: Key Vault Secrets Officer
   - Allows deployment pipeline to access secrets
   - Configured via `Microsoft.Authorization/roleAssignments` resource

4. **Static Web App Settings** - Configured with Key Vault references:
   - `AAD_CLIENT_ID` → `@Microsoft.KeyVault(...;SecretName=aad-client-id)`
   - `AAD_CLIENT_SECRET` → `@Microsoft.KeyVault(...;SecretName=aad-client-secret)`
   - `AzureWebJobsStorage` → `@Microsoft.KeyVault(...;SecretName=storage-connection-string)`
   - `ConnectionStrings__tables` → `@Microsoft.KeyVault(...;SecretName=storage-connection-string)`

**Verify Configuration:**
```bash
# Check Key Vault secrets (should show 3 secrets)
az keyvault secret list --vault-name kv-wheelofdoom --output table

# Check Static Web App settings (should show Key Vault references)
az staticwebapp appsettings list \
  --name swa-wheelofdoom \
  --resource-group rg-wheelofdoom
```

**Security Benefits:**
- ✅ **Single source of truth** - All configuration in Bicep
- ✅ **No secrets in outputs** - All secrets in Key Vault only
- ✅ **No workflow steps** - Everything configured during deployment
- ✅ **Atomic deployment** - Settings deployed with infrastructure
- ✅ **Secure parameters** - `@secure()` masks values in history
- ✅ **RBAC-controlled** - Access grants managed as code
- ✅ **Audit logs** - All secret access logged

**Important**: `ConnectionStrings__tables` matches Aspire's expected configuration format, allowing the backend code to work unchanged in both development (Aspire) and production (Azure Static Web Apps).

### 2. Configure Azure AD Redirect URI

After deployment, update your Azure AD app registration:
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Select your app (e.g., "WheelOfDoom-Auth")
3. Go to Authentication → Add redirect URI
4. Type: Web
5. URI: `https://<static-web-app-name>.azurestaticapps.net/.auth/login/aad/callback`
6. Save

## Deployment Outputs

The Bicep template outputs the following values (useful for CI/CD):

- `staticWebAppDefaultHostName` - URL of the deployed app
- `staticWebAppId` - Resource ID
- `staticWebAppName` - Resource name
- `storageAccountName` - Storage account name
- `storageAccountId` - Storage account resource ID
- `tableEndpoint` - Table storage endpoint
- `keyVaultName` - Key Vault name
- `keyVaultUri` - Key Vault URI
- `keyVaultId` - Key Vault resource ID

**Note**: Secrets (connection strings, AAD credentials) are NOT output for security reasons. They are stored securely in Key Vault by the Bicep template.

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
- Azure Key Vault (Standard): ~$0.03/month (2 secrets × 10,000 operations)
- Azure Functions: $0-1/month (within free tier)

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

### Deployment Fails: "Authorization failed for template resource ... of type 'Microsoft.Authorization/roleAssignments'"

**Error Example:**
```
The client with object id '...' does not have permission to perform action
'Microsoft.Authorization/roleAssignments/write' at scope '/subscriptions/.../resourceGroups/...'
```

**Root Cause:** The service principal lacks permission to create role assignments in the Bicep template.

**Solution:** Grant User Access Administrator role to the service principal:

```bash
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role "User Access Administrator" \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-wheelofdoom
```

See **Step 3: Grant Service Principal Required Permissions** above for complete setup.

### Deployment Fails: General "Authorization failed"

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

*Last updated: 2026-01-27*
