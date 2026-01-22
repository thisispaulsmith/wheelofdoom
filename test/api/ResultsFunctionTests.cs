using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using WheelOfDoom.Api.Functions;
using WheelOfDoom.Api.Models;
using WheelOfDoom.Api.Services;

namespace WheelOfDoom.Api.Tests;

public class ResultsFunctionTests
{
    private readonly Mock<ILogger<ResultsFunction>> _loggerMock;
    private readonly Mock<ITableStorageService> _tableStorageMock;
    private readonly ResultsFunction _function;

    public ResultsFunctionTests()
    {
        _loggerMock = new Mock<ILogger<ResultsFunction>>();
        _tableStorageMock = new Mock<ITableStorageService>();
        _function = new ResultsFunction(_loggerMock.Object, _tableStorageMock.Object);
    }

    [Fact]
    public async Task GetResults_ReturnsOkWithResults()
    {
        // Arrange
        var results = new List<SpinResult>
        {
            new SpinResult { SelectedName = "Alice", SpunBy = "user1", SpunAt = DateTimeOffset.UtcNow },
            new SpinResult { SelectedName = "Bob", SpunBy = "user2", SpunAt = DateTimeOffset.UtcNow.AddHours(-1) }
        };
        _tableStorageMock.Setup(x => x.GetResultsAsync(50)).ReturnsAsync(results);

        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.GetResults(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetResults_ReturnsEmptyListWhenNoResults()
    {
        // Arrange
        _tableStorageMock.Setup(x => x.GetResultsAsync(50)).ReturnsAsync(new List<SpinResult>());

        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.GetResults(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task AddResult_ReturnsBadRequestWhenNameIsEmpty()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"\"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddResult(httpContext.Request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddResult_ReturnsBadRequestWhenBodyIsNull()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(""));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddResult(httpContext.Request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddResult_ReturnsCreatedWhenValid()
    {
        // Arrange
        var spinResult = new SpinResult
        {
            SelectedName = "Charlie",
            SpunBy = "anonymous",
            SpunAt = DateTimeOffset.UtcNow
        };
        _tableStorageMock.Setup(x => x.AddResultAsync("Charlie", It.IsAny<string>())).ReturnsAsync(spinResult);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"Charlie\"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddResult(httpContext.Request);

        // Assert
        Assert.IsType<CreatedResult>(result);
    }

    [Fact]
    public async Task AddResult_TrimsWhitespace()
    {
        // Arrange
        var spinResult = new SpinResult
        {
            SelectedName = "Charlie",
            SpunBy = "anonymous",
            SpunAt = DateTimeOffset.UtcNow
        };
        _tableStorageMock.Setup(x => x.AddResultAsync("Charlie", It.IsAny<string>())).ReturnsAsync(spinResult);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"  Charlie  \"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddResult(httpContext.Request);

        // Assert
        _tableStorageMock.Verify(x => x.AddResultAsync("Charlie", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task AddResult_UsesClientPrincipalHeader()
    {
        // Arrange
        var spinResult = new SpinResult
        {
            SelectedName = "Charlie",
            SpunBy = "testuser@example.com",
            SpunAt = DateTimeOffset.UtcNow
        };
        _tableStorageMock.Setup(x => x.AddResultAsync("Charlie", "testuser@example.com")).ReturnsAsync(spinResult);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-MS-CLIENT-PRINCIPAL-NAME"] = "testuser@example.com";
        httpContext.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("{\"name\":\"Charlie\"}"));
        httpContext.Request.ContentType = "application/json";

        // Act
        var result = await _function.AddResult(httpContext.Request);

        // Assert
        _tableStorageMock.Verify(x => x.AddResultAsync("Charlie", "testuser@example.com"), Times.Once);
    }
}
