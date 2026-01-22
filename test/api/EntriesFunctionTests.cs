using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using WheelOfDoom.Api.Functions;
using WheelOfDoom.Api.Models;
using WheelOfDoom.Api.Services;

namespace WheelOfDoom.Api.Tests;

public class EntriesFunctionTests
{
    private readonly Mock<ILogger<EntriesFunction>> _loggerMock;
    private readonly Mock<ITableStorageService> _tableStorageMock;
    private readonly EntriesFunction _function;

    public EntriesFunctionTests()
    {
        _loggerMock = new Mock<ILogger<EntriesFunction>>();
        _tableStorageMock = new Mock<ITableStorageService>();
        _function = new EntriesFunction(_loggerMock.Object, _tableStorageMock.Object);
    }

    [Fact]
    public async Task GetEntries_ReturnsOkWithEntries()
    {
        // Arrange
        var entries = new List<Entry>
        {
            new Entry { RowKey = "Alice", AddedBy = "user1" },
            new Entry { RowKey = "Bob", AddedBy = "user2" }
        };
        _tableStorageMock.Setup(x => x.GetEntriesAsync()).ReturnsAsync(entries);

        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.GetEntries(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetEntries_ReturnsEmptyListWhenNoEntries()
    {
        // Arrange
        _tableStorageMock.Setup(x => x.GetEntriesAsync()).ReturnsAsync(new List<Entry>());

        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.GetEntries(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task AddEntry_ReturnsBadRequestWhenNameIsEmpty()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"\"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddEntry(httpContext.Request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddEntry_ReturnsBadRequestWhenBodyIsNull()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(""));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddEntry(httpContext.Request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddEntry_ReturnsCreatedWhenValid()
    {
        // Arrange
        var entry = new Entry { RowKey = "Charlie", AddedBy = "anonymous" };
        _tableStorageMock.Setup(x => x.AddEntryAsync("Charlie", It.IsAny<string>())).ReturnsAsync(entry);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"Charlie\"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddEntry(httpContext.Request);

        // Assert
        var createdResult = Assert.IsType<CreatedResult>(result);
        Assert.Contains("Charlie", createdResult.Location);
    }

    [Fact]
    public async Task AddEntry_TrimsWhitespace()
    {
        // Arrange
        var entry = new Entry { RowKey = "Charlie", AddedBy = "anonymous" };
        _tableStorageMock.Setup(x => x.AddEntryAsync("Charlie", It.IsAny<string>())).ReturnsAsync(entry);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"  Charlie  \"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddEntry(httpContext.Request);

        // Assert
        _tableStorageMock.Verify(x => x.AddEntryAsync("Charlie", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task AddEntry_UsesClientPrincipalHeader()
    {
        // Arrange
        var entry = new Entry { RowKey = "Charlie", AddedBy = "testuser@example.com" };
        _tableStorageMock.Setup(x => x.AddEntryAsync("Charlie", "testuser@example.com")).ReturnsAsync(entry);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-MS-CLIENT-PRINCIPAL-NAME"] = "testuser@example.com";
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"Charlie\"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddEntry(httpContext.Request);

        // Assert
        _tableStorageMock.Verify(x => x.AddEntryAsync("Charlie", "testuser@example.com"), Times.Once);
    }
}
