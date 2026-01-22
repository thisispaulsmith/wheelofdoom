using Azure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using WheelOfDoom.Api.Functions;
using WheelOfDoom.Api.Services;

namespace WheelOfDoom.Api.Tests;

public class EntryDeleteFunctionTests
{
    private readonly Mock<ILogger<EntryDeleteFunction>> _loggerMock;
    private readonly Mock<ITableStorageService> _tableStorageMock;
    private readonly EntryDeleteFunction _function;

    public EntryDeleteFunctionTests()
    {
        _loggerMock = new Mock<ILogger<EntryDeleteFunction>>();
        _tableStorageMock = new Mock<ITableStorageService>();
        _function = new EntryDeleteFunction(_loggerMock.Object, _tableStorageMock.Object);
    }

    [Fact]
    public async Task DeleteEntry_ReturnsNoContentOnSuccess()
    {
        // Arrange
        _tableStorageMock.Setup(x => x.DeleteEntryAsync("Alice")).Returns(Task.CompletedTask);

        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.DeleteEntry(request, "Alice");

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteEntry_ReturnsBadRequestWhenNameIsEmpty()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.DeleteEntry(request, "");

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteEntry_ReturnsBadRequestWhenNameIsWhitespace()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.DeleteEntry(request, "   ");

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteEntry_ReturnsNotFoundWhenEntryDoesNotExist()
    {
        // Arrange
        _tableStorageMock
            .Setup(x => x.DeleteEntryAsync("NonExistent"))
            .ThrowsAsync(new RequestFailedException(404, "Not found"));

        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        var result = await _function.DeleteEntry(request, "NonExistent");

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task DeleteEntry_CallsServiceWithCorrectName()
    {
        // Arrange
        _tableStorageMock.Setup(x => x.DeleteEntryAsync("TestUser")).Returns(Task.CompletedTask);

        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;

        // Act
        await _function.DeleteEntry(request, "TestUser");

        // Assert
        _tableStorageMock.Verify(x => x.DeleteEntryAsync("TestUser"), Times.Once);
    }
}
