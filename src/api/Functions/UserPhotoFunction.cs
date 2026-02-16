using System.Net;
using Azure.Core;
using Azure.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace WheelOfDoom.Api.Functions;

public class UserPhotoFunction
{
    private readonly ILogger<UserPhotoFunction> _logger;
    private readonly HttpClient _httpClient;

    public UserPhotoFunction(ILogger<UserPhotoFunction> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
    }

    [Function("GetUserPhoto")]
    public async Task<IActionResult> GetUserPhoto(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user/photo")] HttpRequest req)
    {
        var user = GetUserIdentity(req);

        if (user == "anonymous")
        {
            _logger.LogInformation("Anonymous user requested photo");
            return new NotFoundResult();
        }

        try
        {
            // Get access token for Graph API
            var token = await GetGraphAccessToken();

            // Fetch photo from Graph API
            var graphUrl = $"https://graph.microsoft.com/v1.0/users/{user}/photo/$value";
            var request = new HttpRequestMessage(HttpMethod.Get, graphUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var graphResponse = await _httpClient.SendAsync(request);

            if (!graphResponse.IsSuccessStatusCode)
            {
                _logger.LogInformation("No photo available for user {User}", user);
                return new NotFoundResult();
            }

            // Return photo as image/jpeg
            var photoBytes = await graphResponse.Content.ReadAsByteArrayAsync();

            _logger.LogInformation("Successfully fetched photo for user {User}", user);

            return new FileContentResult(photoBytes, "image/jpeg")
            {
                FileDownloadName = null // Don't trigger download
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch user photo for {User}", user);
            return new StatusCodeResult((int)HttpStatusCode.InternalServerError);
        }
    }

    private static string GetUserIdentity(HttpRequest req)
    {
        // Azure Static Web Apps passes user info in headers
        var clientPrincipal = req.Headers["X-MS-CLIENT-PRINCIPAL-NAME"].FirstOrDefault();
        if (!string.IsNullOrEmpty(clientPrincipal))
        {
            return clientPrincipal;
        }

        // Fallback for local development
        return "anonymous";
    }

    private async Task<string> GetGraphAccessToken()
    {
        var tenantId = Environment.GetEnvironmentVariable("AZURE_TENANT_ID");
        var clientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID");
        var clientSecret = Environment.GetEnvironmentVariable("AZURE_CLIENT_SECRET");

        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            throw new InvalidOperationException("Azure AD credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET environment variables.");
        }

        var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        var tokenRequestContext = new TokenRequestContext(
            new[] { "https://graph.microsoft.com/.default" }
        );

        var token = await credential.GetTokenAsync(tokenRequestContext);
        return token.Token;
    }
}
