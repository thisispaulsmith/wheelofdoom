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

// Azure Static Web App
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
      apiLocation: 'src/api'
      outputLocation: 'dist'
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

// Managed Identity for deployment script
resource deploymentScriptIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${keyVaultName}-script-identity'
  location: location
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
}

// Grant deployment script identity permission to read storage account keys
resource storageKeyOperatorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, deploymentScriptIdentity.id, 'StorageAccountKeyOperatorServiceRole')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '81a9662b-bebf-436f-a333-f67b29880f12') // Storage Account Key Operator Service Role
    principalId: deploymentScriptIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Grant deployment script identity permission to write secrets to Key Vault
resource keyVaultSecretsOfficerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, deploymentScriptIdentity.id, 'KeyVaultSecretsOfficer')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7') // Key Vault Secrets Officer
    principalId: deploymentScriptIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Deployment script to store storage connection string in Key Vault
resource storeConnectionString 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'store-storage-connection-string'
  location: location
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${deploymentScriptIdentity.id}': {}
    }
  }
  properties: {
    azCliVersion: '2.52.0'
    retentionInterval: 'P1D'
    timeout: 'PT10M'
    cleanupPreference: 'OnSuccess'
    environmentVariables: [
      {
        name: 'STORAGE_ACCOUNT_NAME'
        value: storageAccount.name
      }
      {
        name: 'RESOURCE_GROUP'
        value: resourceGroup().name
      }
      {
        name: 'KEY_VAULT_NAME'
        value: keyVault.name
      }
    ]
    scriptContent: '''
      # Get storage account connection string
      CONNECTION_STRING=$(az storage account show-connection-string \
        --name $STORAGE_ACCOUNT_NAME \
        --resource-group $RESOURCE_GROUP \
        --query connectionString \
        --output tsv)

      # Store in Key Vault
      az keyvault secret set \
        --vault-name $KEY_VAULT_NAME \
        --name "storage-connection-string" \
        --value "$CONNECTION_STRING"

      echo "Successfully stored storage connection string in Key Vault"
    '''
  }
  dependsOn: [
    storageKeyOperatorRole
    keyVaultSecretsOfficerRole
    entriesTable
    resultsTable
  ]
}

// Outputs
output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output tableEndpoint string = storageAccount.properties.primaryEndpoints.table
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultId string = keyVault.id
