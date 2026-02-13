using './main.bicep'

param staticWebAppName = 'swa-wheelofdoom'
param functionAppName = 'func-wheelofdoom'
param storageAccountName = 'stowheelofdoom' // Must be unique, 3-24 chars, lowercase/numbers only
param tenantId = '3edc4486-5878-46a9-a974-2a7787926f35' // Replace with actual tenant ID
param environmentName = 'R&D'

// Secure parameters (AAD credentials) are passed via command line or GitHub secrets
// DO NOT store actual values in this file - always pass via command line parameters
param aadClientId = '' // Pass via: --parameters aadClientId='<value>' or from GitHub secret AAD_CLIENT_ID
param aadClientSecret = '' // Pass via: --parameters aadClientSecret='<value>' or from GitHub secret AAD_CLIENT_SECRET

