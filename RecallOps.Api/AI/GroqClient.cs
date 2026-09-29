using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecallOps.Api.AI;

public interface IGroqClient
{
    Task<string> ChatAsync(string systemPrompt, string userMessage, string? model = null, CancellationToken cancellationToken = default);
    Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default);
}

public class GroqClient : IGroqClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GroqClient> _logger;
    private readonly string _defaultModel;
    private readonly string _fallbackModel;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public GroqClient(HttpClient httpClient, IConfiguration configuration, ILogger<GroqClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        var apiKey = configuration["Groq:ApiKey"] ?? Environment.GetEnvironmentVariable("GROQ_API_KEY") ?? string.Empty;
        _defaultModel = configuration["Groq:DefaultModel"] ?? "qwen/qwen3-32b";
        _fallbackModel = configuration["Groq:FallbackModel"] ?? "llama-3.3-70b-versatile";

        _httpClient.BaseAddress = new Uri("https://api.groq.com/openai/v1/");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _httpClient.Timeout = TimeSpan.FromSeconds(60);
    }

    public async Task<string> ChatAsync(string systemPrompt, string userMessage, string? model = null, CancellationToken cancellationToken = default)
    {
        var useModel = model ?? _defaultModel;
        
        try
        {
            return await SendChatRequestAsync(systemPrompt, userMessage, useModel, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Groq request failed with model {Model}, retrying with fallback {Fallback}", useModel, _fallbackModel);
            
            try
            {
                return await SendChatRequestAsync(systemPrompt, userMessage, _fallbackModel, cancellationToken);
            }
            catch (Exception fallbackEx)
            {
                _logger.LogError(fallbackEx, "Groq fallback model also failed");
                throw new GroqException("AI service temporarily unavailable. Please retry.", fallbackEx);
            }
        }
    }

    private async Task<string> SendChatRequestAsync(string systemPrompt, string userMessage, string model, CancellationToken cancellationToken)
    {
        var payload = new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userMessage }
            },
            temperature = 0.3,
            max_tokens = 4096,
            stream = false
        };

        var json = JsonSerializer.Serialize(payload, JsonOpts);
        var request = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("chat/completions", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Groq API error {StatusCode}: {Body}", response.StatusCode, errorBody);
            throw new GroqException($"Groq API error {response.StatusCode}: {errorBody}");
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        
        using var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return content ?? string.Empty;
    }

    public async Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("models", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}

public class GroqException : Exception
{
    public GroqException(string message) : base(message) { }
    public GroqException(string message, Exception inner) : base(message, inner) { }
}
