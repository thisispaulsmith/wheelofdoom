// ==================================================================================
// Wheel of Doom - Infrastructure as Code
// ==================================================================================
//
// KNOWN WHAT-IF BEHAVIOR:
// The 'az deployment group what-if' command will show some changes even when
// resources haven't changed. This is expected behavior:
//
// 1. Application Insights (Flow_Type, Request_Source):
//    - These are service-managed properties set by Azure
//    - Cannot be controlled via Bicep
//    - Safe to ignore
//
// 2. Function App Settings (shown as additions with + sign):
//    - What-if cannot evaluate listKeys() at plan time
//    - Settings appear as "new" even though they exist and won't change
//    - This is a known Bicep limitation (https://aka.ms/WhatIfIssues)
//    - Safe to ignore if values are correct
//
// 3. Static Web App (deploymentAuthPolicy, stableInboundIP, trafficSplitting):
//    - Service-managed properties not included in template
//    - Azure manages these automatically
//    - Shown as "removed" but won't actually be deleted
//    - Safe to ignore
//
// 4. Function App deployment.storage.value:
//    - Shows expression syntax vs evaluated value
//    - Values are identical after evaluation
//    - Safe to ignore
//
// 5. Linked Backend (managedServiceIdentityType):
//    - Service-managed property
//    - Safe to ignore
//
// Real changes will show different values or significantly different structure.
// ==================================================================================

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

@secure()
@description('Azure AD client ID for user authentication')
param aadClientId string

@secure()
@description('Azure AD client secret for user authentication')
param aadClientSecret string

@description('Name of the Function App')
param functionAppName string

var deploymentStorageContainerName = 'app-package'

// Log Analytics Workspace for Application Insights
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${staticWebAppName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${staticWebAppName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: 30
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
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
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
  resource blobServices 'blobServices' = {
    name: 'default'
    properties: {
      deleteRetentionPolicy: {
        enabled: false
        allowPermanentDelete: false
      }
    }
    resource deploymentContainer 'containers' = {
      name: deploymentStorageContainerName
      properties: {
        publicAccess: 'None'
        defaultEncryptionScope: '$account-encryption-key'
        denyEncryptionScopeOverride: false
      }
    }
  }
}

var storageKey = storageAccount.listKeys().keys[0].value

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

// App Service Plan for Azure Functions (Consumption tier)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${functionAppName}-plan'
  location: location
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
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
  tags: {
    environment: environmentName
    application: 'WheelOfDoom'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      netFrameworkVersion: 'v4.6'
      localMySqlEnabled: false
    }
    
    functionAppConfig: {
      runtime: {
        name: 'dotnet-isolated'
        version: '10.0'
      }
      deployment: {
        storage: {
          type: 'blobContainer'
          // You need a container URL here, not just the account.
          // Example shape: "https://<account>.blob.core.windows.net/<container>"
          value: '${storageAccount.properties.primaryEndpoints.blob}${deploymentStorageContainerName}'
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 100
        instanceMemoryMB: 512
      }
    }
  }
  resource configAppSettings 'config' = {
    name: 'appsettings'
    properties: {
      AzureWebJobsStorage:'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'
      DEPLOYMENT_STORAGE_CONNECTION_STRING: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'
      ConnectionStrings__tables: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'
      APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
      // Azure AD credentials for Microsoft Graph API access
      AZURE_TENANT_ID: tenantId
      AZURE_CLIENT_ID: aadClientId
      AZURE_CLIENT_SECRET: aadClientSecret
    }
  }
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

// Configure Static Web App settings with direct secret configuration
// Secrets are passed as secure parameters and stored in Azure platform app settings
// Note: These settings are encrypted at rest by Azure and transmitted securely
// Only AAD credentials are needed - routing handled by linkedBackend
resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    AAD_CLIENT_ID: aadClientId
    AAD_CLIENT_SECRET: aadClientSecret
  }
  dependsOn: [
    linkedBackend
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
output appInsightsName string = appInsights.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
