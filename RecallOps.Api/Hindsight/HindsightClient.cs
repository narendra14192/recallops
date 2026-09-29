using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace RecallOps.Api.Hindsight;

/// <summary>
/// Live Hindsight client using the real Hindsight Cloud REST API.
/// Base URL: https://api.hindsight.vectorize.io
/// Retain:  POST /v1/default/banks/{bankId}/memories
/// Recall:  POST /v1/default/banks/{bankId}/memories/recall
/// </summary>
public class HindsightClient : IHindsightClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<HindsightClient> _logger;
    private readonly string _baseUrl;

    public string Mode => "Live";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    public HindsightClient(HttpClient httpClient, IConfiguration configuration, ILogger<HindsightClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _baseUrl = configuration["Hindsight:BaseUrl"] ?? "https://api.hindsight.vectorize.io";
        var apiKey = configuration["Hindsight:ApiKey"] ?? Environment.GetEnvironmentVariable("HINDSIGHT_API_KEY") ?? string.Empty;

        _httpClient.BaseAddress = new Uri(_baseUrl.TrimEnd('/') + "/");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task RetainAsync(string bankId, string content, string? documentId = null, string[]? tags = null, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            items = new[]
            {
                new
                {
                    content,
                    document_id = documentId ?? Guid.NewGuid().ToString(),
                    tags = tags ?? []
                }
            }
        };

        var json = JsonSerializer.Serialize(payload, JsonOpts);
        var request = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync(
                $"v1/default/banks/{Uri.EscapeDataString(bankId)}/memories?async=false",
                request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Hindsight retain failed {StatusCode}: {Body}", response.StatusCode, errorBody);
                throw new HindsightException($"Retain failed with status {response.StatusCode}: {errorBody}");
            }

            _logger.LogInformation("Memory retained to bank '{BankId}'", bankId);
        }
        catch (HindsightException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hindsight retain error for bank '{BankId}'", bankId);
            throw new HindsightException($"Failed to retain memory: {ex.Message}", ex);
        }
    }

    public async Task<RecallResult> RecallAsync(string bankId, string query, int maxTokens = 2000, string budget = "mid", CancellationToken cancellationToken = default)
    {
        var payload = new { query, max_tokens = maxTokens, budget };
        var json = JsonSerializer.Serialize(payload, JsonOpts);
        var request = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync(
                $"v1/default/banks/{Uri.EscapeDataString(bankId)}/memories/recall",
                request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Hindsight recall failed {StatusCode}: {Body}", response.StatusCode, errorBody);
                throw new HindsightException($"Recall failed with status {response.StatusCode}: {errorBody}");
            }

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("Hindsight recall response for bank '{BankId}': {Preview}", bankId, responseBody[..Math.Min(200, responseBody.Length)]);

            // Parse the response - Hindsight returns a text/markdown context
            // The recall response may be plain text or JSON with memories
            var result = ParseRecallResponse(responseBody);
            return result;
        }
        catch (HindsightException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hindsight recall error for bank '{BankId}'", bankId);
            throw new HindsightException($"Failed to recall memory: {ex.Message}", ex);
        }
    }

    private static RecallResult ParseRecallResponse(string responseBody)
    {
        var result = new RecallResult();
        
        // Try JSON parse first
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            // Handle Hindsight Cloud results array
            if (root.TryGetProperty("results", out var resultsEl) && resultsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in resultsEl.EnumerateArray())
                {
                    var match = new MemoryMatch();
                    if (item.TryGetProperty("text", out var t)) match.Content = t.GetString() ?? "";
                    if (item.TryGetProperty("document_id", out var d)) match.DocumentId = d.GetString() ?? "";
                    if (item.TryGetProperty("scores", out var scoresEl))
                    {
                        if (scoresEl.TryGetProperty("reranker", out var r)) match.Score = r.GetDouble();
                        else if (scoresEl.TryGetProperty("final", out var f)) match.Score = f.GetDouble();
                        else if (scoresEl.TryGetProperty("semantic", out var s)) match.Score = s.GetDouble();
                    }
                    else if (item.TryGetProperty("score", out var sc))
                    {
                        match.Score = sc.GetDouble();
                    }
                    result.Memories.Add(match);
                }
                result.RawContent = string.Join("\n\n", result.Memories.Select(m => m.Content));
                return result;
            }

            // Handle memories array format
            if (root.TryGetProperty("memories", out var memoriesEl) && memoriesEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var mem in memoriesEl.EnumerateArray())
                {
                    var match = new MemoryMatch();
                    if (mem.TryGetProperty("content", out var c)) match.Content = c.GetString() ?? "";
                    if (mem.TryGetProperty("document_id", out var d)) match.DocumentId = d.GetString() ?? "";
                    if (mem.TryGetProperty("score", out var s)) match.Score = s.GetDouble();
                    result.Memories.Add(match);
                }
                result.RawContent = responseBody;
                return result;
            }

            // Some endpoints return { "context": "..." }
            if (root.TryGetProperty("context", out var ctx))
            {
                result.RawContent = ctx.GetString() ?? "";
                if (!string.IsNullOrWhiteSpace(result.RawContent))
                {
                    result.Memories.Add(new MemoryMatch { Content = result.RawContent, Score = 1.0 });
                }
                return result;
            }

            // Try result/data/items
            if (root.TryGetProperty("result", out var resultEl))
            {
                result.RawContent = resultEl.GetString() ?? resultEl.ToString();
                if (!string.IsNullOrWhiteSpace(result.RawContent))
                    result.Memories.Add(new MemoryMatch { Content = result.RawContent, Score = 0.9 });
                return result;
            }
        }
        catch
        {
            // Not JSON; treat as plain text
        }

        // Plain text response
        if (!string.IsNullOrWhiteSpace(responseBody))
        {
            result.RawContent = responseBody;
            result.Memories.Add(new MemoryMatch { Content = responseBody, Score = 0.9 });
        }

        return result;
    }

    public async Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("health", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<int> CountMemoriesAsync(string bankId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"v1/default/banks/{Uri.EscapeDataString(bankId)}/memories/list",
                cancellationToken);
            if (!response.IsSuccessStatusCode) return 0;
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("total", out var t)) return t.GetInt32();
            if (doc.RootElement.TryGetProperty("count", out var c)) return c.GetInt32();
            if (doc.RootElement.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Array)
                return items.GetArrayLength();
            return 0;
        }
        catch
        {
            return 0;
        }
    }

    public async Task DeleteBankAsync(string bankId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _httpClient.DeleteAsync(
                $"v1/default/banks/{Uri.EscapeDataString(bankId)}",
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete bank '{BankId}'", bankId);
        }
    }
}

public class HindsightException : Exception
{
    public HindsightException(string message) : base(message) { }
    public HindsightException(string message, Exception inner) : base(message, inner) { }
}
