using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using WheelOfDoom.Api.Services;

namespace WheelOfDoom.Api.Functions;

public class EntryDeleteFunction
{
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
        _logger.LogInformation("Deleting entry: {Name}", name);

        if (string.IsNullOrWhiteSpace(name))
        {
            return new BadRequestObjectResult(new { error = "Name is required" });
        }

        try
        {
            await _tableStorage.DeleteEntryAsync(name);
            return new NoContentResult();
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return new NotFoundObjectResult(new { error = "Entry not found" });
        }
    }
}
