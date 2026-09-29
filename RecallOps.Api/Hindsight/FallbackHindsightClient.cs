namespace RecallOps.Api.Hindsight;

/// <summary>
/// Wraps Hindsight operations with automatic fallback to Local mode when Live mode fails.
/// Surfaces a warning when falling back.
/// </summary>
public class FallbackHindsightClient : IHindsightClient
{
    private readonly HindsightClient _liveClient;
    private readonly LocalMemoryClient _localClient;
    private readonly ILogger<FallbackHindsightClient> _logger;
    private bool _liveAvailable = true;
    private DateTime _lastHealthCheck = DateTime.MinValue;
    private readonly TimeSpan _healthCheckInterval = TimeSpan.FromMinutes(5);

    public string Mode => _liveAvailable ? "Live" : "Local (Fallback)";
    public bool IsUsingFallback => !_liveAvailable;

    public FallbackHindsightClient(
        HindsightClient liveClient,
        LocalMemoryClient localClient,
        ILogger<FallbackHindsightClient> logger)
    {
        _liveClient = liveClient;
        _localClient = localClient;
        _logger = logger;
    }

    private async Task<bool> CheckLiveHealthAsync(CancellationToken cancellationToken)
    {
        if (DateTime.UtcNow - _lastHealthCheck < _healthCheckInterval)
            return _liveAvailable;

        _liveAvailable = await _liveClient.IsHealthyAsync(cancellationToken);
        _lastHealthCheck = DateTime.UtcNow;

        if (!_liveAvailable)
            _logger.LogWarning("Hindsight Live mode unavailable; using Local fallback.");

        return _liveAvailable;
    }

    public async Task RetainAsync(string bankId, string content, string? documentId = null, string[]? tags = null, CancellationToken cancellationToken = default)
    {
        if (_liveAvailable)
        {
            try
            {
                await _liveClient.RetainAsync(bankId, content, documentId, tags, cancellationToken);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Hindsight Live retain failed; falling back to Local.");
                _liveAvailable = false;
            }
        }
        await _localClient.RetainAsync(bankId, content, documentId, tags, cancellationToken);
    }

    public async Task<RecallResult> RecallAsync(string bankId, string query, int maxTokens = 2000, string budget = "mid", CancellationToken cancellationToken = default)
    {
        if (_liveAvailable)
        {
            try
            {
                return await _liveClient.RecallAsync(bankId, query, maxTokens, budget, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Hindsight Live recall failed; falling back to Local.");
                _liveAvailable = false;
            }
        }
        return await _localClient.RecallAsync(bankId, query, maxTokens, budget, cancellationToken);
    }

    public async Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default)
        => await CheckLiveHealthAsync(cancellationToken);

    public async Task<int> CountMemoriesAsync(string bankId, CancellationToken cancellationToken = default)
    {
        if (_liveAvailable)
        {
            try { return await _liveClient.CountMemoriesAsync(bankId, cancellationToken); }
            catch { }
        }
        return await _localClient.CountMemoriesAsync(bankId, cancellationToken);
    }

    public async Task DeleteBankAsync(string bankId, CancellationToken cancellationToken = default)
    {
        if (_liveAvailable)
        {
            try { await _liveClient.DeleteBankAsync(bankId, cancellationToken); }
            catch { }
        }
        await _localClient.DeleteBankAsync(bankId, cancellationToken);
    }
}
