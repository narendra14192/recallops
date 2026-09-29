using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecallOps.Api.Hindsight;

/// <summary>
/// Local in-memory + JSON file persisted implementation of IHindsightClient.
/// Used as fallback when Hindsight:Mode = "Local" or when Live mode fails.
/// Persists memories under /data/local-memory.json.
/// </summary>
public class LocalMemoryClient : IHindsightClient
{
    private readonly ILogger<LocalMemoryClient> _logger;
    private readonly string _dataPath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private Dictionary<string, List<LocalMemory>> _banks = new();
    private bool _loaded = false;

    public string Mode => "Local";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public LocalMemoryClient(ILogger<LocalMemoryClient> logger, IConfiguration configuration)
    {
        _logger = logger;
        var dataDir = configuration["LocalMemory:DataPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "data");
        Directory.CreateDirectory(dataDir);
        _dataPath = Path.Combine(dataDir, "local-memory.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_loaded) return;
        await _lock.WaitAsync();
        try
        {
            if (_loaded) return;
            if (File.Exists(_dataPath))
            {
                var json = await File.ReadAllTextAsync(_dataPath);
                _banks = JsonSerializer.Deserialize<Dictionary<string, List<LocalMemory>>>(json, JsonOpts) ?? new();
            }
            _loaded = true;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task SaveAsync()
    {
        var json = JsonSerializer.Serialize(_banks, JsonOpts);
        await File.WriteAllTextAsync(_dataPath, json);
    }

    public async Task RetainAsync(string bankId, string content, string? documentId = null, string[]? tags = null, CancellationToken cancellationToken = default)
    {
        await EnsureLoadedAsync();
        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (!_banks.ContainsKey(bankId))
                _banks[bankId] = [];

            _banks[bankId].Add(new LocalMemory
            {
                Id = Guid.NewGuid().ToString(),
                Content = content,
                DocumentId = documentId ?? Guid.NewGuid().ToString(),
                Tags = tags ?? [],
                CreatedAt = DateTime.UtcNow
            });

            await SaveAsync();
            _logger.LogInformation("[LocalMemory] Retained memory to bank '{BankId}'. Total: {Count}", bankId, _banks[bankId].Count);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<RecallResult> RecallAsync(string bankId, string query, int maxTokens = 2000, string budget = "mid", CancellationToken cancellationToken = default)
    {
        await EnsureLoadedAsync();

        if (!_banks.TryGetValue(bankId, out var memories) || memories.Count == 0)
        {
            return new RecallResult();
        }

        // Simple keyword-based relevance scoring
        var queryWords = query.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var scored = memories
            .Select(m => new
            {
                Memory = m,
                Score = ComputeRelevanceScore(m.Content.ToLowerInvariant(), queryWords)
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(5)
            .ToList();

        if (scored.Count == 0)
        {
            // Return top 3 by recency if no keyword matches
            scored = memories
                .OrderByDescending(m => m.CreatedAt)
                .Take(3)
                .Select(m => new { Memory = m, Score = 0.1 })
                .ToList();
        }

        var result = new RecallResult();
        foreach (var item in scored)
        {
            // Normalize score to 0-1 range
            var normalizedScore = Math.Min(1.0, item.Score / 10.0);
            result.Memories.Add(new MemoryMatch
            {
                Content = item.Memory.Content,
                DocumentId = item.Memory.DocumentId,
                Score = normalizedScore,
                Tags = item.Memory.Tags
            });
        }

        result.RawContent = string.Join("\n\n---\n\n", result.Memories.Select(m => m.Content));
        return result;
    }

    private static double ComputeRelevanceScore(string content, string[] queryWords)
    {
        double score = 0;
        foreach (var word in queryWords)
        {
            if (word.Length < 3) continue; // skip short words
            var count = CountOccurrences(content, word);
            score += count;
            // Bonus for exact phrase
            if (content.Contains(word, StringComparison.OrdinalIgnoreCase))
                score += 0.5;
        }
        return score;
    }

    private static int CountOccurrences(string text, string pattern)
    {
        int count = 0, index = 0;
        while ((index = text.IndexOf(pattern, index, StringComparison.OrdinalIgnoreCase)) != -1)
        {
            count++;
            index += pattern.Length;
        }
        return count;
    }

    public Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);

    public async Task<int> CountMemoriesAsync(string bankId, CancellationToken cancellationToken = default)
    {
        await EnsureLoadedAsync();
        return _banks.TryGetValue(bankId, out var memories) ? memories.Count : 0;
    }

    public async Task DeleteBankAsync(string bankId, CancellationToken cancellationToken = default)
    {
        await EnsureLoadedAsync();
        await _lock.WaitAsync(cancellationToken);
        try
        {
            _banks.Remove(bankId);
            await SaveAsync();
            _logger.LogInformation("[LocalMemory] Deleted bank '{BankId}'", bankId);
        }
        finally
        {
            _lock.Release();
        }
    }
}

public class LocalMemory
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string DocumentId { get; set; } = string.Empty;
    public string[] Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}
