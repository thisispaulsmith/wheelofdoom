var builder = DistributedApplication.CreateBuilder(args);

// Azure Storage (uses Azurite emulator in development)
var storage = builder.AddAzureStorage("storage")
    .RunAsEmulator();

var tables = storage.AddTables("tables");

// Azure Functions API
var api = builder.AddAzureFunctionsProject<Projects.WheelOfDoom_Api>("api")
    .WithReference(tables)
    .WaitFor(tables);

// React Frontend
var frontend = builder.AddNpmApp("frontend", "../app", "dev")
    .WithReference(api)
    .WaitFor(api)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints();

builder.Build().Run();
