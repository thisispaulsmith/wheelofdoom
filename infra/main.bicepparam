using './main.bicep'

param staticWebAppName = 'swa-wheelofdoom'
param storageAccountName = 'stowheelofdoom' // Must be unique, 3-24 chars, lowercase/numbers only
param keyVaultName = 'kv-wheelofdoom' // Must be globally unique, 3-24 chars
param tenantId = '3edc4486-5878-46a9-a974-2a7787926f35' // Replace with actual tenant ID
param environmentName = 'production'
param githubActionsPrincipalId = '80b80aad-1520-4322-8eed-dc67b953a5dd' // Replace with service principal object ID

// Secure parameters (AAD credentials) are passed via command line or GitHub secrets
// DO NOT store actual values in this file - always pass via command line parameters
param aadClientId = '' // Pass via: --parameters aadClientId='<value>' or from GitHub secret AAD_CLIENT_ID
param aadClientSecret = '' // Pass via: --parameters aadClientSecret='<value>' or from GitHub secret AAD_CLIENT_SECRET

