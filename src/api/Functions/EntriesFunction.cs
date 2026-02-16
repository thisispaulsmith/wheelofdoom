using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using WheelOfDoom.Api.Services;

namespace WheelOfDoom.Api.Functions;

public class EntriesFunction
{
    private static readonly ActivitySource ActivitySource = new("WheelOfDoom.Api");
    private readonly ILogger<EntriesFunction> _logger;
    private readonly ITableStorageService _tableStorage;

    public EntriesFunction(ILogger<EntriesFunction> logger, ITableStorageService tableStorage)
    {
        _logger = logger;
        _tableStorage = tableStorage;
    }

    [Function("GetEntries")]
    public async Task<IActionResult> GetEntries(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "entries")] HttpRequest req)
    {
        _logger.LogInformation("Getting all entries");

        var entries = await _tableStorage.GetEntriesAsync();
        var result = entries.Select(e => new
        {
            name = e.RowKey,
            addedBy = e.AddedBy,
            addedAt = e.Timestamp
        });

        return new OkObjectResult(result);
    }

    [Function("AddEntry")]
    public async Task<IActionResult> AddEntry(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "entries")] HttpRequest req)
    {
        using var activity = ActivitySource.StartActivity("AddEntry");

        var user = GetUserIdentity(req);
        _logger.LogInformation("Adding entry by {User}", user);

        activity?.SetTag("user.name", user);

        AddEntryRequest? body;
        try
        {
            body = await req.ReadFromJsonAsync<AddEntryRequest>();
        }
        catch (System.Text.Json.JsonException)
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON body" });
        }

        if (body == null || string.IsNullOrWhiteSpace(body.Name))
        {
            return new BadRequestObjectResult(new { error = "Name is required" });
        }

        var trimmedName = body.Name.Trim();

        if (trimmedName.Length > 40)
        {
            return new BadRequestObjectResult(new { error = "Name must be 40 characters or less" });
        }

        activity?.SetTag("entry.name", trimmedName);

        var entry = await _tableStorage.AddEntryAsync(trimmedName, user);

        activity?.SetTag("entry.added", true);
        _logger.LogInformation("Entry added: {EntryName} by {User}", entry.RowKey, user);

        return new CreatedResult($"/api/entries/{entry.RowKey}", new
        {
            name = entry.RowKey,
            addedBy = entry.AddedBy,
            addedAt = entry.Timestamp
        });
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

    private record AddEntryRequest(string Name);
}
