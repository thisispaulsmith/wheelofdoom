using WheelOfDoom.Api.Models;

namespace WheelOfDoom.Api.Services;

public interface ITableStorageService
{
    Task<IEnumerable<Entry>> GetEntriesAsync();
    Task<Entry> AddEntryAsync(string name, string addedBy);
    Task DeleteEntryAsync(string name);
    Task<IEnumerable<SpinResult>> GetResultsAsync(int count = 50);
    Task<SpinResult> AddResultAsync(string selectedName, string spunBy);
}
