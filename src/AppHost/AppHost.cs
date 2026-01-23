var builder = DistributedApplication.CreateBuilder(args);

// Azure Storage (uses Azurite emulator in development)
var storage = builder.AddAzureStorage("storage")
    .RunAsEmulator(azurite =>
    {
        azurite.WithLifetime(ContainerLifetime.Persistent);
    });

var tables = storage.AddTables("tables");

// Azure Functions API
var api = builder.AddAzureFunctionsProject<Projects.WheelOfDoom_Api>("api")
    .WithHostStorage(storage)
    .WithReference(tables)
    .WaitFor(tables);

// React Frontend
var frontend = builder.AddJavaScriptApp("frontend", "../app", "dev")
    .WithNpm(installCommand: "ci", installArgs: ["--legacy-peer-deps"])
    .WithReference(api)
    .WaitFor(api)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints();

builder.Build().Run();
