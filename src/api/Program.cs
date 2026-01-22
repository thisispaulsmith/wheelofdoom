using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WheelOfDoom.Api.Services;

var builder = FunctionsApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.ConfigureFunctionsWebApplication();

// Register Table Storage service
var connectionString = builder.Configuration["AzureWebJobsStorage"]
    ?? Environment.GetEnvironmentVariable("AzureWebJobsStorage")
    ?? "UseDevelopmentStorage=true";
builder.Services.AddSingleton<ITableStorageService>(new TableStorageService(connectionString));

builder.Build().Run();
