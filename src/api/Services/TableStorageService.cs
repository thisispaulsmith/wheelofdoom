using Azure.Data.Tables;
using WheelOfDoom.Api.Models;

namespace WheelOfDoom.Api.Services;

public class TableStorageService : ITableStorageService
{
    private readonly TableClient _entriesTable;
    private readonly TableClient _resultsTable;

    public TableStorageService(TableServiceClient serviceClient)
    {
        _entriesTable = serviceClient.GetTableClient("Entries");
        _entriesTable.CreateIfNotExists();

        _resultsTable = serviceClient.GetTableClient("Results");
        _resultsTable.CreateIfNotExists();
    }

    public async Task<IEnumerable<Entry>> GetEntriesAsync()
    {
        var entries = new List<Entry>();
        await foreach (var entry in _entriesTable.QueryAsync<Entry>(e => e.PartitionKey == "wheel"))
        {
            entries.Add(entry);
        }
        return entries.OrderBy(e => e.RowKey);
    }

    public async Task<Entry> AddEntryAsync(string name, string addedBy)
    {
        var entry = new Entry
        {
            PartitionKey = "wheel",
            RowKey = name,
            AddedBy = addedBy
        };

        await _entriesTable.UpsertEntityAsync(entry);
        return entry;
    }

    public async Task DeleteEntryAsync(string name)
    {
        await _entriesTable.DeleteEntityAsync("wheel", name);
    }

    public async Task<IEnumerable<SpinResult>> GetResultsAsync(int count = 50)
    {
        var results = new List<SpinResult>();
        await foreach (var result in _resultsTable.QueryAsync<SpinResult>(r => r.PartitionKey == "wheel"))
        {
            results.Add(result);
            if (results.Count >= count) break;
        }
        return results; // Already sorted by RowKey (inverted timestamp = newest first)
    }

    public async Task<SpinResult> AddResultAsync(string selectedName, string spunBy)
    {
        // Inverted timestamp for newest-first sorting
        var invertedTicks = DateTime.MaxValue.Ticks - DateTime.UtcNow.Ticks;

        var result = new SpinResult
        {
            PartitionKey = "wheel",
            RowKey = invertedTicks.ToString("D19"),
            SelectedName = selectedName,
            SpunBy = spunBy,
            SpunAt = DateTimeOffset.UtcNow
        };

        await _resultsTable.AddEntityAsync(result);
        return result;
    }
}
