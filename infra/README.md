# Infrastructure as Code

This directory contains Bicep templates for provisioning Azure resources for the Wheel of Doom application.

## Prerequisites

- Azure CLI installed (`az --version` to verify)
- Logged in to Azure (`az login`)
- Appropriate permissions to create resources in the subscription
- Resource group created (`rg-wheelofdoom-prod`)

## Resources Overview

The Bicep template (`main.bicep`) provisions the following Azure resources:

1. **Azure Static Web App** (`wheelofdoom-swa`)
   - SKU: Standard tier
   - Hosts React frontend (Vite build output)
   - Hosts .NET Azure Functions backend (managed)
   - Integrated SSL, CDN, and custom domains
   - Azure AD authentication via `staticwebapp.config.json`

2. **Storage Account** (`wheelodomstorage`)
   - SKU: Standard LRS (Locally Redundant Storage)
   - Type: StorageV2
   - TLS 1.2 minimum
   - Public blob access disabled
   - Used for Azure Table Storage

3. **Table Service**
   - Entries table: Stores wheel entries (PartitionKey: "wheel", RowKey: person name)
   - Results table: Stores spin results (PartitionKey: "wheel", RowKey: inverted timestamp)

4. **Azure Key Vault** (`wheelofdoom-kv`)
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
  --name rg-wheelofdoom-prod \
  --location eastus
```

### Step 2: Update Parameters

Edit `main.bicepparam` and replace placeholders:
- `<YOUR_TENANT_ID>` - Your Azure AD tenant ID (find at portal.azure.com → Azure Active Directory → Overview)
- `storageAccountName` - Must be globally unique (3-24 chars, lowercase/numbers only)

### Step 3: Deploy Infrastructure

```bash
az deployment group create \
  --resource-group rg-wheelofdoom-prod \
  --template-file main.bicep \
  --parameters main.bicepparam
```

### Step 4: Verify Deployment

```bash
# List all resources in the resource group
az resource list \
  --resource-group rg-wheelofdoom-prod \
  --output table

# Check Static Web App details
az staticwebapp show \
  --name wheelofdoom-swa \
  --resource-group rg-wheelofdoom-prod

# Check Storage Account tables
az storage table list \
  --account-name wheelodomstorage \
  --output table
```

## Configuration After Deployment

### 1. Get Static Web Apps Deployment Token

```bash
az staticwebapp secrets list \
  --name wheelofdoom-swa \
  --resource-group rg-wheelofdoom-prod \
  --query "properties.apiKey" \
  --output tsv
```

Save this token as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub secrets.

### 2. How Secrets Are Managed

**Bicep Template** (automatic):
- Bicep creates Key Vault secret resource with storage connection string
- Uses `listKeys()` to retrieve storage account key
- **Safe to use in secret resource** - value stored encrypted in Key Vault, not in deployment outputs
- Secret resource: `storage-connection-string`

**GitHub Actions Workflow** (automatic):
- Workflow stores AAD client secret from GitHub secrets into Key Vault: `aad-client-secret`
- App settings configured with Key Vault reference syntax:
  ```
  @Microsoft.KeyVault(VaultName=wheelofdoom-kv;SecretName=storage-connection-string)
  ```

**Security Pattern**:
- ✅ `listKeys()` in **outputs** = BAD (plaintext in deployment history)
- ✅ `listKeys()` in **secret resource** = GOOD (encrypted in Key Vault)
- ✅ No secrets in Bicep outputs or deployment history
- ✅ No secrets exposed in GitHub Actions logs
- ✅ RBAC-controlled access to all secrets

**Manual configuration** (if needed):
```bash
# Store secrets in Key Vault
az keyvault secret set \
  --vault-name wheelofdoom-kv \
  --name "storage-connection-string" \
  --value "<connection-string>"

# Configure app settings with Key Vault references
az staticwebapp appsettings set \
  --name wheelofdoom-swa \
  --resource-group rg-wheelofdoom-prod \
  --setting-names \
    AAD_CLIENT_ID="<your-aad-client-id>" \
    AAD_CLIENT_SECRET="@Microsoft.KeyVault(VaultName=wheelofdoom-kv;SecretName=aad-client-secret)" \
    AzureWebJobsStorage="@Microsoft.KeyVault(VaultName=wheelofdoom-kv;SecretName=storage-connection-string)" \
    ConnectionStrings__tables="@Microsoft.KeyVault(VaultName=wheelofdoom-kv;SecretName=storage-connection-string)"
```

**Security Benefits**:
- ✅ Secrets never appear in plaintext in deployment outputs
- ✅ No secret exposure in workflow logs (masked + Key Vault storage)
- ✅ Secrets stored with encryption at rest and in transit
- ✅ RBAC-controlled access to Key Vault
- ✅ Audit logs for all secret access

**Important**: `ConnectionStrings__tables` matches Aspire's expected configuration format, allowing the backend code to work unchanged in both development (Aspire) and production (Azure Static Web Apps).

### 3. Configure Azure AD Redirect URI

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

**Note**: Connection strings are NOT output for security reasons. They are stored securely in Key Vault by the deployment workflow.

View outputs:

```bash
az deployment group show \
  --resource-group rg-wheelofdoom-prod \
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
  --resource-group rg-wheelofdoom-prod \
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
  --resource-group rg-wheelofdoom-prod \
  --start-date 2026-01-01 \
  --end-date 2026-01-31
```

## Cleanup

To delete all resources (destructive operation):

```bash
az group delete \
  --name rg-wheelofdoom-prod \
  --yes \
  --no-wait
```

## Troubleshooting

### Deployment Fails: "Storage account name already taken"

Storage account names must be globally unique. Update `storageAccountName` in `main.bicepparam` to a different value.

### Deployment Fails: "Authorization failed"

Ensure your Azure CLI session has Contributor role on the subscription or resource group:

```bash
az role assignment create \
  --assignee <your-user-principal-name> \
  --role Contributor \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-wheelofdoom-prod
```

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

*Last updated: 2026-01-26*
