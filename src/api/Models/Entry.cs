using Azure;
using Azure.Data.Tables;

namespace WheelOfDoom.Api.Models;

public class Entry : ITableEntity
{
    public string PartitionKey { get; set; } = "wheel";
    public string RowKey { get; set; } = default!; // Name
    public string AddedBy { get; set; } = default!;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
}
