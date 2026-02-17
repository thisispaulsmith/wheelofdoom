using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WheelOfDoom.Api.Services;

var builder = FunctionsApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.ConfigureFunctionsWebApplication();

// Register HttpClient for Graph API calls
builder.Services.AddHttpClient();

// Use Aspire client integration
builder.AddAzureTableServiceClient("tables");

// Register Table Storage service
builder.Services.AddSingleton<ITableStorageService, TableStorageService>();

builder.Build().Run();
