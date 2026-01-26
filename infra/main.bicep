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

// Outputs
output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output tableEndpoint string = storageAccount.properties.primaryEndpoints.table
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
