using './main.bicep'

param staticWebAppName = 'wheelofdoom-swa'
param storageAccountName = 'wheelodomstorage' // Must be unique, 3-24 chars, lowercase/numbers only
param keyVaultName = 'wheelofdoom-kv' // Must be globally unique, 3-24 chars
param tenantId = '<YOUR_TENANT_ID>' // Replace with actual tenant ID
param environmentName = 'prod'
