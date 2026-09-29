namespace RecallOps.Api.Hindsight;

/// <summary>
/// Interface for Hindsight memory operations. Swappable between Live (cloud) and Local (in-memory+JSON) implementations.
/// </summary>
public interface IHindsightClient
{
    /// <summary>
    /// Store a new memory in the bank.
    /// </summary>
    Task RetainAsync(string bankId, string content, string? documentId = null, string[]? tags = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Search the memory bank for relevant memories matching the query.
    /// </summary>
    Task<RecallResult> RecallAsync(string bankId, string query, int maxTokens = 2000, string budget = "mid", CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if the client is available / reachable.
    /// </summary>
    Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the current mode (Live or Local).
    /// </summary>
    string Mode { get; }

    /// <summary>
    /// Count memories in a bank (approximation).
    /// </summary>
    Task<int> CountMemoriesAsync(string bankId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete all memories in the specified bank (for demo reset).
    /// </summary>
    Task DeleteBankAsync(string bankId, CancellationToken cancellationToken = default);
}

public class RecallResult
{
    public List<MemoryMatch> Memories { get; set; } = [];
    public bool HasMatches => Memories.Count > 0;
    public string RawContent { get; set; } = string.Empty;
}

public class MemoryMatch
{
    public string Content { get; set; } = string.Empty;
    public string DocumentId { get; set; } = string.Empty;
    public double Score { get; set; }
    public string[] Tags { get; set; } = [];
}
