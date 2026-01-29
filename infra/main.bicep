@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the Static Web App')
param staticWebAppName string

@description('Name of the Storage Account (must be globally unique)')
param storageAccountName string

@description('Azure AD Tenant ID')
param tenantId string

@description('Environment name (dev, staging, prod)')
param environmentName string = 'prod'

@description('Key Vault name (must be globally unique, 3-24 chars)')
param keyVaultName string

@secure()
@description('Azure AD client ID for user authentication')
param aadClientId string

@secure()
@description('Azure AD client secret for user authentication')
param aadClientSecret string

@description('GitHub Actions service principal object ID for Key Vault access')
param githubActionsPrincipalId string

@description('Name of the Function App')
param functionAppName string

// App Service Plan for Azure Functions (Consumption tier)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${functionAppName}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true  // Required for Linux
  }
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
}

// Azure Function App
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: appServicePlan.id
    reserved: true
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|9.0'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [
          'https://${staticWebAppName}.azurestaticapps.net'
        ]
        supportCredentials: false
      }
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=storage-connection-string)'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=storage-connection-string)'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
        {
          name: 'ConnectionStrings__tables'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=storage-connection-string)'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: ''  // Optional: Add Application Insights later
        }
      ]
    }
    httpsOnly: true
  }
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
  dependsOn: [
    storageConnectionStringSecret
  ]
}

// Azure Static Web App (Frontend only)
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/thisispaulsmith/wheelofdoom'
    branch: 'master'
    buildProperties: {
      appLocation: 'src/app'
      outputLocation: 'dist'
      // apiLocation removed - using linked backend Function App
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
  }
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
}

// Link Function App as backend to Static Web App
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: functionAppName
  properties: {
    backendResourceId: functionApp.id
    region: location
  }
}

// Storage Account for Table Storage
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
}

// Table Service
resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

// Entries Table
resource entriesTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'Entries'
}

// Results Table
resource resultsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'Results'
}

// Azure Key Vault for secure secret storage
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenantId
    enableRbacAuthorization: true  // Use RBAC instead of access policies
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
}

var storageKey = storageAccount.listKeys().keys[0].value

// Store storage account connection string as Key Vault secret
// Note: Using listKeys() here is SAFE - the value is stored encrypted in Key Vault,
// not exposed in deployment outputs/history (unlike output variables)
resource storageConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'storage-connection-string'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'
  }
  dependsOn: [
    githubActionsKeyVaultRole
  ]
}

// Store AAD client ID as Key Vault secret
resource aadClientIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'aad-client-id'
  properties: {
    value: aadClientId
  }
  dependsOn: [
    githubActionsKeyVaultRole
  ]
}

// Store AAD client secret as Key Vault secret
resource aadClientSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'aad-client-secret'
  properties: {
    value: aadClientSecret
  }
  dependsOn: [
    githubActionsKeyVaultRole
  ]
}

// Grant GitHub Actions service principal Key Vault Secrets Officer role
// This allows the deployment pipeline to read/write secrets during deployment
resource githubActionsKeyVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, githubActionsPrincipalId, 'KeyVaultSecretsOfficer')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7')
    principalId: githubActionsPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Configure Static Web App settings with Key Vault references
// Note: Static Web Apps can read Key Vault secrets via special Azure platform handling
// The @Microsoft.KeyVault syntax is resolved by Azure at runtime
resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    AAD_CLIENT_ID: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=aad-client-id)'
    AAD_CLIENT_SECRET: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=aad-client-secret)'
    FUNCTION_APP_URL: 'https://${functionApp.properties.defaultHostName}'
  }
  dependsOn: [
    aadClientIdSecret
    aadClientSecretSecret
    githubActionsKeyVaultRole
    functionApp
  ]
}

// Outputs
output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output functionAppName string = functionApp.name
output functionAppDefaultHostName string = functionApp.properties.defaultHostName
output functionAppId string = functionApp.id
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output tableEndpoint string = storageAccount.properties.primaryEndpoints.table
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultId string = keyVault.id
