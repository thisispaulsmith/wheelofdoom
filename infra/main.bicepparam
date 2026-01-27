using './main.bicep'

param staticWebAppName = 'swa-wheelofdoom'
param storageAccountName = 'stowheelodomstorage' // Must be unique, 3-24 chars, lowercase/numbers only
param keyVaultName = 'kv-wheelofdoom' // Must be globally unique, 3-24 chars
param tenantId = '3edc4486-5878-46a9-a974-2a7787926f35' // Replace with actual tenant ID
param environmentName = 'production'
param githubActionsPrincipalId = '80b80aad-1520-4322-8eed-dc67b953a5dd' // Replace with service principal object ID

// Secure parameters (AAD credentials) are passed via command line
// These are NOT stored in this file for security reasons
param aadClientId = '' // Passed from GitHub secrets during workflow execution
param aadClientSecret = '' // Passed from GitHub secrets during workflow execution

