using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using WheelOfDoom.Api.Services;

namespace WheelOfDoom.Api.Functions;

public class EntryDeleteFunction
{
    private static readonly ActivitySource ActivitySource = new("WheelOfDoom.Api");
    private readonly ILogger<EntryDeleteFunction> _logger;
    private readonly ITableStorageService _tableStorage;

    public EntryDeleteFunction(ILogger<EntryDeleteFunction> logger, ITableStorageService tableStorage)
    {
        _logger = logger;
        _tableStorage = tableStorage;
    }

    [Function("DeleteEntry")]
    public async Task<IActionResult> DeleteEntry(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "entries/{name}")] HttpRequest req,
        string name)
    {
        using var activity = ActivitySource.StartActivity("DeleteEntry");

        var user = GetUserIdentity(req);

        activity?.SetTag("user.name", user);
        activity?.SetTag("entry.name", name);

        _logger.LogInformation("Deleting entry: {Name} by {User}", name, user);

        if (string.IsNullOrWhiteSpace(name))
        {
            return new BadRequestObjectResult(new { error = "Name is required" });
        }

        try
        {
            await _tableStorage.DeleteEntryAsync(name);
            activity?.SetTag("entry.deleted", true);
            _logger.LogInformation("Entry deleted: {Name} by {User}", name, user);
            return new NoContentResult();
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return new NotFoundObjectResult(new { error = "Entry not found" });
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
}
