using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using WheelOfDoom.Api.Services;

namespace WheelOfDoom.Api.Functions;

public class ResultsFunction
{
    private static readonly ActivitySource ActivitySource = new("WheelOfDoom.Api");
    private readonly ILogger<ResultsFunction> _logger;
    private readonly ITableStorageService _tableStorage;

    public ResultsFunction(ILogger<ResultsFunction> logger, ITableStorageService tableStorage)
    {
        _logger = logger;
        _tableStorage = tableStorage;
    }

    [Function("GetResults")]
    public async Task<IActionResult> GetResults(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "results")] HttpRequest req)
    {
        _logger.LogInformation("Getting results history");

        var results = await _tableStorage.GetResultsAsync();
        var response = results.Select(r => new
        {
            selectedName = r.SelectedName,
            spunBy = r.SpunBy,
            spunAt = r.SpunAt
        });

        return new OkObjectResult(response);
    }

    [Function("AddResult")]
    public async Task<IActionResult> AddResult(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "results")] HttpRequest req)
    {
        using var activity = ActivitySource.StartActivity("WheelSpun");  // Business event name

        var user = GetUserIdentity(req);

        activity?.SetTag("user.name", user);

        _logger.LogInformation("Recording spin result by {User}", user);

        AddResultRequest? body;
        try
        {
            body = await req.ReadFromJsonAsync<AddResultRequest>();
        }
        catch (System.Text.Json.JsonException)
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON body" });
        }

        if (body == null || string.IsNullOrWhiteSpace(body.Name))
        {
            return new BadRequestObjectResult(new { error = "Name is required" });
        }

        activity?.SetTag("winner.name", body.Name.Trim());

        var result = await _tableStorage.AddResultAsync(body.Name.Trim(), user);

        activity?.SetTag("wheel.spun", true);
        _logger.LogInformation("Wheel spun - Winner: {Winner} by {User}", result.SelectedName, user);

        return new CreatedResult("/api/results", new
        {
            selectedName = result.SelectedName,
            spunBy = result.SpunBy,
            spunAt = result.SpunAt
        });
    }

    private static string GetUserIdentity(HttpRequest req)
    {
        var clientPrincipal = req.Headers["X-MS-CLIENT-PRINCIPAL-NAME"].FirstOrDefault();
        if (!string.IsNullOrEmpty(clientPrincipal))
        {
            return clientPrincipal;
        }
        return "anonymous";
    }

    private record AddResultRequest(string Name);
}
