using Azure;
using Azure.Data.Tables;

namespace WheelOfDoom.Api.Models;

public class SpinResult : ITableEntity
{
    public string PartitionKey { get; set; } = "wheel";
    public string RowKey { get; set; } = default!; // Inverted timestamp
    public string SelectedName { get; set; } = default!;
    public string SpunBy { get; set; } = default!;
    public DateTimeOffset SpunAt { get; set; }
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
}
