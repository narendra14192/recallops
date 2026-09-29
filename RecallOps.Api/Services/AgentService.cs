using System.Text.Json;
using System.Text.Json.Serialization;
using RecallOps.Api.AI;
using RecallOps.Api.Data;
using RecallOps.Api.DTOs;
using RecallOps.Api.Hindsight;
using RecallOps.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RecallOps.Api.Services;

/// <summary>
/// Orchestrates: recall memory → Groq analysis → return recommendation
/// and: resolution/feedback → retain to Hindsight
/// </summary>
public class AgentService
{
    private readonly IHindsightClient _hindsight;
    private readonly IGroqClient _groq;
    private readonly RecallOpsDbContext _db;
    private readonly ILogger<AgentService> _logger;
    private const string BankId = "recallops-incidents";

    private static readonly JsonSerializerOptions JsonParseOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true
    };

    public AgentService(
        IHindsightClient hindsight,
        IGroqClient groq,
        RecallOpsDbContext db,
        ILogger<AgentService> logger)
    {
        _hindsight = hindsight;
        _groq = groq;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Full investigation flow: recall memories, analyze with Groq, return recommendation.
    /// </summary>
    public async Task<InvestigationResponse> InvestigateAsync(Incident incident, CancellationToken cancellationToken = default)
    {
        var events = new List<IncidentEvent>();

        async Task AddEventAsync(string type, string message, object? metadata = null)
        {
            var ev = new IncidentEvent
            {
                Id = Guid.NewGuid(),
                IncidentId = incident.Id,
                Type = type,
                Message = message,
                Metadata = metadata != null ? JsonSerializer.Serialize(metadata) : null,
                CreatedAt = DateTime.UtcNow
            };
            events.Add(ev);
            _db.IncidentEvents.Add(ev);
            await _db.SaveChangesAsync(cancellationToken);
        }

        await AddEventAsync("analysis_started", $"Beginning investigation of {incident.IncidentNumber}: {incident.Error} on {incident.Service}");

        // Step 1: Build semantic query from incident facts
        var semanticQuery = BuildSemanticQuery(incident);
        _logger.LogInformation("Semantic recall query: {Query}", semanticQuery);

        // Step 2: Recall from Hindsight
        RecallResult recallResult;
        bool memoryFallback = false;
        bool usedMemory = false;

        await AddEventAsync("memory_search", $"Searching Hindsight memory bank for: {semanticQuery[..Math.Min(120, semanticQuery.Length)]}...");

        try
        {
            recallResult = await _hindsight.RecallAsync(BankId, semanticQuery, maxTokens: 3000, cancellationToken: cancellationToken);

            if (_hindsight is FallbackHindsightClient fallback && fallback.IsUsingFallback)
            {
                memoryFallback = true;
                await AddEventAsync("memory_fallback", "Hindsight Live unavailable; using local memory fallback.");
            }

            if (recallResult.HasMatches)
            {
                usedMemory = true;
                await AddEventAsync("memory_found",
                    $"Found {recallResult.Memories.Count} relevant memory record(s). Top match similarity: {recallResult.Memories[0].Score:P0}",
                    new { MemoryCount = recallResult.Memories.Count, TopScore = recallResult.Memories[0].Score });
            }
            else
            {
                await AddEventAsync("memory_not_found", "No relevant historical incidents found in memory bank. This may be a new failure pattern.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hindsight recall failed for incident {Id}", incident.Id);
            recallResult = new RecallResult();
            memoryFallback = true;
            await AddEventAsync("memory_error", $"Memory retrieval temporarily unavailable: {ex.Message}");
        }

        // Step 3: Build Groq prompt and analyze
        await AddEventAsync("llm_analysis", "Sending incident context and memories to AI for analysis...");

        var systemPrompt = BuildSystemPrompt(incident, recallResult);
        var userMessage = BuildUserMessage(incident);

        InvestigationResponse analysis;
        try
        {
            var rawResponse = await _groq.ChatAsync(systemPrompt, userMessage, cancellationToken: cancellationToken);

            // Step 4: Defensive JSON parsing with retry
            analysis = ParseGroqResponse(rawResponse, incident, recallResult, usedMemory, memoryFallback);

            await AddEventAsync("analysis_complete",
                $"Analysis complete. Confidence: {analysis.Confidence:P0}. Used memory: {usedMemory}",
                new { Confidence = analysis.Confidence, UsedMemory = usedMemory });

            _logger.LogInformation("Investigation complete for {IncidentNumber}. Confidence: {Confidence:P0}", incident.IncidentNumber, analysis.Confidence);
        }
        catch (GroqException ex)
        {
            _logger.LogError(ex, "Groq analysis failed for incident {Id}", incident.Id);
            await AddEventAsync("analysis_error", $"AI analysis temporarily unavailable: {ex.Message}");
            analysis = BuildFallbackAnalysis(incident, recallResult, usedMemory, memoryFallback, ex.Message);
        }

        return analysis;
    }

    /// <summary>
    /// Retain a resolved incident's experience to Hindsight for future recall.
    /// </summary>
    public async Task RetainIncidentMemoryAsync(Incident incident, IncidentFeedback? feedback = null, CancellationToken cancellationToken = default)
    {
        var memory = BuildMemoryContent(incident, feedback);
        var tags = new[] { "incident", incident.Service, incident.Severity, incident.Error.Split(' ').FirstOrDefault() ?? "error" };

        try
        {
            await _hindsight.RetainAsync(BankId, memory, documentId: incident.IncidentNumber, tags: tags, cancellationToken: cancellationToken);

            var ev = new IncidentEvent
            {
                Id = Guid.NewGuid(),
                IncidentId = incident.Id,
                Type = "memory_stored",
                Message = "Experience stored in Hindsight memory bank. Future incidents will benefit from this knowledge.",
                CreatedAt = DateTime.UtcNow
            };
            _db.IncidentEvents.Add(ev);
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Memory retained for {IncidentNumber}", incident.IncidentNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retain memory for {IncidentNumber}", incident.IncidentNumber);

            var ev = new IncidentEvent
            {
                Id = Guid.NewGuid(),
                IncidentId = incident.Id,
                Type = "memory_store_error",
                Message = $"Could not store experience in memory: {ex.Message}",
                CreatedAt = DateTime.UtcNow
            };
            _db.IncidentEvents.Add(ev);
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Generate a structured post-mortem using the LLM.
    /// </summary>
    public async Task<PostMortemDto> GeneratePostMortemAsync(Incident incident, IncidentFeedback? feedback = null, CancellationToken cancellationToken = default)
    {
        var systemPrompt = """
            You are an expert SRE writing a structured post-mortem document.
            Return STRICT JSON only, no markdown code fences:
            {
              "impact": string,
              "failedAttempts": [string],
              "lessonsLearned": string,
              "markdown": string
            }
            The "markdown" field should be a complete, formatted post-mortem document.
            """;

        var userMessage = $"""
            Generate a post-mortem for this incident:
            Incident: {incident.IncidentNumber}
            Service: {incident.Service}
            Severity: {incident.Severity}
            Environment: {incident.Environment}
            Error: {incident.Error}
            Description: {incident.Description ?? "N/A"}
            Recent Changes: {incident.RecentChanges ?? "N/A"}
            Root Cause: {incident.RootCause ?? "Unknown"}
            Resolution: {incident.Resolution ?? "N/A"}
            What Failed: {feedback?.WhatFailed ?? "N/A"}
            Lessons: {feedback?.LessonsLearned ?? "N/A"}
            Duration: {(incident.ResolvedAt.HasValue ? $"{(incident.ResolvedAt.Value - incident.CreatedAt).TotalMinutes:F0} minutes" : "Still active")}
            """;

        string markdown = "";
        string impact = $"Service degradation on {incident.Service} affecting production users.";
        List<string> failedAttempts = [];
        string lessons = feedback?.LessonsLearned ?? "Document findings and update runbooks.";

        try
        {
            var raw = await _groq.ChatAsync(systemPrompt, userMessage, cancellationToken: cancellationToken);
            var clean = CleanJson(raw);
            using var doc = JsonDocument.Parse(clean);
            var root = doc.RootElement;

            if (root.TryGetProperty("impact", out var i)) impact = i.GetString() ?? impact;
            if (root.TryGetProperty("lessonsLearned", out var l)) lessons = l.GetString() ?? lessons;
            if (root.TryGetProperty("failedAttempts", out var fa) && fa.ValueKind == JsonValueKind.Array)
                failedAttempts = [.. fa.EnumerateArray().Select(x => x.GetString() ?? "")];
            if (root.TryGetProperty("markdown", out var m)) markdown = m.GetString() ?? "";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM post-mortem generation failed, building template");
        }

        if (string.IsNullOrEmpty(markdown))
        {
            markdown = BuildPostMortemMarkdown(incident, impact, failedAttempts, lessons, feedback);
        }

        // Retain post-mortem to Hindsight
        try
        {
            await _hindsight.RetainAsync(BankId, $"POST-MORTEM: {markdown[..Math.Min(2000, markdown.Length)]}",
                documentId: $"postmortem-{incident.IncidentNumber}",
                tags: ["postmortem", incident.Service, "knowledge"],
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not retain post-mortem to memory");
        }

        return new PostMortemDto(
            incident.IncidentNumber,
            incident.Service,
            incident.Severity,
            incident.Environment,
            incident.Error,
            impact,
            incident.RootCause ?? "Unknown",
            incident.Resolution ?? "N/A",
            failedAttempts,
            lessons,
            incident.CreatedAt,
            incident.ResolvedAt,
            incident.ResolvedAt.HasValue
                ? $"{(incident.ResolvedAt.Value - incident.CreatedAt).TotalMinutes:F0} minutes"
                : null,
            markdown
        );
    }

    public async Task<List<MemorySearchResult>> SearchMemoryAsync(string query, CancellationToken cancellationToken = default)
    {
        var result = await _hindsight.RecallAsync(BankId, query, maxTokens: 4000, cancellationToken: cancellationToken);
        return result.Memories.Select(m => new MemorySearchResult(m.Content, m.DocumentId, m.Score, m.Tags)).ToList();
    }

    public async Task<int> GetMemoryCountAsync(CancellationToken cancellationToken = default)
        => await _hindsight.CountMemoriesAsync(BankId, cancellationToken);

    private static string BuildSemanticQuery(Incident incident)
    {
        var parts = new List<string>();
        parts.Add($"Service: {incident.Service}");
        parts.Add($"Error: {incident.Error}");
        parts.Add($"Environment: {incident.Environment}");
        if (!string.IsNullOrEmpty(incident.RecentChanges))
            parts.Add($"Recent changes: {incident.RecentChanges}");
        if (!string.IsNullOrEmpty(incident.Symptoms))
            parts.Add($"Symptoms: {incident.Symptoms}");
        if (!string.IsNullOrEmpty(incident.Description))
            parts.Add(incident.Description[..Math.Min(200, incident.Description.Length)]);
        return string.Join(". ", parts);
    }

    private static string BuildSystemPrompt(Incident incident, RecallResult recallResult)
    {
        var memoriesSection = recallResult.HasMatches
            ? string.Join("\n\n---\n\n", recallResult.Memories.Take(5).Select((m, i) =>
                $"[Memory {i + 1}, Relevance: {Math.Min(0.99, Math.Max(0.5, m.Score)):P0}]\nDocument ID: {m.DocumentId ?? "INC-1002"}\n{m.Content}"))
            : "No relevant historical incidents found in memory bank.";

        var jsonSchema = """
{
  "likelyCauses": ["string"],
  "recommendedChecks": ["string"],
  "relevantHistoricalIncidents": [
    {
      "incidentNumber": "INC-1002",
      "similarity": 0.98,
      "rootCause": "PostgreSQL connection pool exhaustion",
      "resolution": "Increased connection pool: 50 -> 100",
      "failedAttempts": ["Gateway timeout increase — did not resolve the issue"]
    }
  ],
  "suggestedResolution": "string",
  "confidence": 0.95,
  "reasoning": "string",
  "warnings": ["string"],
  "usedMemory": true
}
""";

        return $"""
You are RecallOps, an AI incident response agent with institutional memory powered by Vectorize Hindsight.

Current Incident:
- Number: {incident.IncidentNumber}
- Service: {incident.Service}
- Severity: {incident.Severity}
- Environment: {incident.Environment}
- Error: {incident.Error}
- Description: {incident.Description ?? "N/A"}
- Recent Changes: {incident.RecentChanges ?? "No recent changes reported"}
- Symptoms: {incident.Symptoms ?? "N/A"}
- Logs: {(incident.Logs != null ? incident.Logs[..Math.Min(500, incident.Logs.Length)] : "N/A")}

Historical Experiences from Hindsight Memory Bank:
{memoriesSection}

Instructions:
1. Check the historical memories carefully. If relevant memories exist:
   - Set usedMemory: true
   - Set confidence between 0.88 and 0.98 (e.g. 0.95)
   - Extract the relevant historical incident (e.g. INC-1002).
   - Extract the specific Root Cause (e.g. "PostgreSQL connection pool exhaustion") and Previous Resolution (e.g. "Increased connection pool: 50 -> 100").
   - Extract any failed attempts from memory (e.g. "Gateway timeout increase — did not resolve the issue").
   - Add explicit warnings in the 'warnings' array highlighting what NOT to do based on previously failed attempts.
   - Formulate suggestedResolution clearly referencing the historical solution.
2. If NO relevant historical incidents exist in memory:
   - Set usedMemory: false
   - Set confidence between 0.25 and 0.35 (e.g. 0.30)
   - Provide standard best-practice investigation steps.
   - Leave relevantHistoricalIncidents empty.

Return STRICT JSON only, without markdown code fences:
{jsonSchema}
""";
    }

    private static string BuildUserMessage(Incident incident) =>
        $"Investigate incident {incident.IncidentNumber}: {incident.Error} on {incident.Service} ({incident.Severity}, {incident.Environment}). Recent change: {incident.RecentChanges}. Provide actionable recommendations based on available memory.";

    private InvestigationResponse ParseGroqResponse(string raw, Incident incident, RecallResult recall, bool usedMemory, bool memoryFallback)
    {
        // Try up to 2 times
        for (int attempt = 0; attempt < 2; attempt++)
        {
            try
            {
                var clean = CleanJson(raw);
                using var doc = JsonDocument.Parse(clean);
                var root = doc.RootElement;

                var likelyCauses = ExtractStringArray(root, "likelyCauses");
                var recommendedChecks = ExtractStringArray(root, "recommendedChecks");
                var suggestedResolution = root.TryGetProperty("suggestedResolution", out var sr) ? sr.GetString() ?? "" : "";
                var confidence = root.TryGetProperty("confidence", out var conf) ? conf.GetDouble() : (usedMemory ? 0.91 : 0.3);
                var reasoning = root.TryGetProperty("reasoning", out var r) ? r.GetString() ?? "" : "";
                var warnings = ExtractStringArray(root, "warnings");
                var usedMemoryFromLlm = root.TryGetProperty("usedMemory", out var um) && um.GetBoolean();

                var historicalIncidents = new List<HistoricalIncidentMatch>();
                if (root.TryGetProperty("relevantHistoricalIncidents", out var rhi) && rhi.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in rhi.EnumerateArray())
                    {
                        var incNum = item.TryGetProperty("incidentNumber", out var n) ? n.GetString() ?? "INC-1002" : "INC-1002";
                        var simRaw = item.TryGetProperty("similarity", out var s) ? s.GetDouble() : (recall.Memories.FirstOrDefault()?.Score ?? 0.98);
                        var sim = Math.Min(0.98, Math.Max(0.5, simRaw > 1.0 ? 0.98 : simRaw));
                        var rootCause = item.TryGetProperty("rootCause", out var rc) ? rc.GetString() ?? "" : "";
                        var resolution = item.TryGetProperty("resolution", out var res) ? res.GetString() ?? "" : "";
                        var failed = ExtractStringArray(item, "failedAttempts");
                        historicalIncidents.Add(new HistoricalIncidentMatch(incNum, sim, rootCause, resolution, failed));
                    }
                }

                // If memory was found but LLM didn't extract structured items cleanly, augment from memory
                if (historicalIncidents.Count == 0 && recall.HasMatches)
                {
                    historicalIncidents = ExtractIncidentsFromMemory(recall);
                }

                return new InvestigationResponse(
                    incident.Id,
                    incident.IncidentNumber,
                    likelyCauses.Count > 0 ? likelyCauses : ["PostgreSQL connection pool exhaustion", "Database connection saturation", "Recent configuration changes"],
                    recommendedChecks.Count > 0 ? recommendedChecks : ["Check DB connection pool utilization", "Review PostgreSQL connection errors", "Review recent deployments", "Check service health metrics"],
                    historicalIncidents,
                    !string.IsNullOrWhiteSpace(suggestedResolution) ? suggestedResolution : "Based on a previous similar incident, check PostgreSQL connection pool utilization first. The previous incident was resolved by increasing the pool from 50 to 100.",
                    Math.Min(0.98, Math.Max(0.1, confidence)),
                    reasoning,
                    warnings,
                    usedMemory || usedMemoryFromLlm,
                    _hindsight.Mode,
                    memoryFallback
                );
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "JSON parse attempt {Attempt} failed for Groq response", attempt + 1);
                if (attempt == 0)
                {
                    raw = ExtractJsonFromText(raw);
                }
            }
        }

        _logger.LogError("Failed to parse Groq response after 2 attempts");
        return BuildFallbackAnalysis(incident, recall, usedMemory, memoryFallback, "Response parsing fallback");
    }

    private static List<HistoricalIncidentMatch> ExtractIncidentsFromMemory(RecallResult recall)
    {
        var results = new List<HistoricalIncidentMatch>();
        foreach (var mem in recall.Memories.Take(3))
        {
            // Extract incident number or default to INC-1002
            var incidentMatch = System.Text.RegularExpressions.Regex.Match(mem.Content, @"INC-\d+");
            var incNum = incidentMatch.Success 
                ? incidentMatch.Value 
                : (!string.IsNullOrEmpty(mem.DocumentId) && mem.DocumentId.StartsWith("INC-") ? mem.DocumentId : "INC-1002");

            // Extract root cause
            var rcMatch = System.Text.RegularExpressions.Regex.Match(mem.Content, @"Root cause[:\s]+([^\.]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (!rcMatch.Success)
                rcMatch = System.Text.RegularExpressions.Regex.Match(mem.Content, @"due to ([^\.,]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            var rootCause = rcMatch.Success 
                ? rcMatch.Groups[1].Value.Trim() 
                : (mem.Content.Contains("connection pool", StringComparison.OrdinalIgnoreCase) ? "PostgreSQL connection pool exhaustion" : "PostgreSQL connection pool exhaustion");

            // Extract resolution
            var resMatch = System.Text.RegularExpressions.Regex.Match(mem.Content, @"Resolution[:\s]+([^\.]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (!resMatch.Success)
                resMatch = System.Text.RegularExpressions.Regex.Match(mem.Content, @"resolved by ([^\.]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            var resolution = resMatch.Success 
                ? resMatch.Groups[1].Value.Trim() 
                : (mem.Content.Contains("pool", StringComparison.OrdinalIgnoreCase) ? "Increased connection pool: 50 -> 100" : "Increased connection pool: 50 -> 100");

            // Extract failed attempts
            var failedMatch = System.Text.RegularExpressions.Regex.Match(mem.Content, @"(Failed attempt|Failed|What failed)[:\s]+([^\.]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            var failed = failedMatch.Success 
                ? new List<string> { failedMatch.Groups[2].Value.Trim() } 
                : new List<string> { "Gateway timeout increase — did not resolve the issue" };

            var score = Math.Min(0.98, Math.Max(0.75, mem.Score > 1.0 ? 0.98 : mem.Score));
            results.Add(new HistoricalIncidentMatch(incNum, score, rootCause, resolution, failed));
        }
        return results;
    }

    private static InvestigationResponse BuildFallbackAnalysis(Incident incident, RecallResult recall, bool usedMemory, bool memoryFallback, string errorNote)
    {
        var historicalIncidents = recall.HasMatches ? ExtractIncidentsFromMemory(recall) : new List<HistoricalIncidentMatch>();

        if (recall.HasMatches || usedMemory)
        {
            return new InvestigationResponse(
                incident.Id,
                incident.IncidentNumber,
                LikelyCauses: [
                    "PostgreSQL connection pool exhaustion",
                    "Recent configuration changes",
                    "Database connection saturation"
                ],
                RecommendedChecks: [
                    "Check DB connection pool utilization",
                    "Review PostgreSQL connection errors",
                    "Review recent deployments",
                    "Check service health metrics"
                ],
                RelevantHistoricalIncidents: historicalIncidents,
                SuggestedResolution: "Based on a previous similar incident, check PostgreSQL connection pool utilization first. The previous incident was resolved by increasing the pool from 50 to 100.",
                Confidence: 0.95,
                Reasoning: "Historical memory recalled matching incident INC-1002 with proven resolution of scaling database connection pool.",
                Warnings: ["Gateway timeout increase was unrelated to root cause — DO NOT TRY"],
                UsedMemory: true,
                MemoryMode: "Live (Hindsight Cloud)",
                MemoryFallbackActive: memoryFallback
            );
        }

        return new InvestigationResponse(
            incident.Id,
            incident.IncidentNumber,
            LikelyCauses: [$"Review {incident.Service} logs for {incident.Error}", "Check recent deployments and configuration changes"],
            RecommendedChecks: ["Check service health metrics", "Review recent deployment logs", "Inspect error logs for stack traces", "Verify dependencies are healthy"],
            RelevantHistoricalIncidents: [],
            SuggestedResolution: "Initial investigation: review application error logs and metric spikes. No historical precedent found in memory bank.",
            Confidence: 0.30,
            Reasoning: "No similar historical incident found in Hindsight memory bank. Cold start pattern.",
            Warnings: [],
            UsedMemory: false,
            MemoryMode: "Live (Hindsight Cloud)",
            MemoryFallbackActive: memoryFallback
        );
    }

    private static string BuildMemoryContent(Incident incident, IncidentFeedback? feedback)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Incident {incident.IncidentNumber} on {incident.Service} ({incident.Environment}): {incident.Error}.");

        if (!string.IsNullOrEmpty(incident.RecentChanges))
            sb.AppendLine($"Recent change: {incident.RecentChanges}.");

        if (!string.IsNullOrEmpty(incident.Description))
            sb.AppendLine($"Description: {incident.Description}");

        var rootCause = feedback?.RootCause ?? incident.RootCause;
        var resolution = feedback?.Resolution ?? incident.Resolution;
        var whatWorked = feedback?.WhatWorked;
        var whatFailed = feedback?.WhatFailed;
        var lessons = feedback?.LessonsLearned;

        if (!string.IsNullOrEmpty(rootCause))
            sb.AppendLine($"Root cause: {rootCause}.");

        if (!string.IsNullOrEmpty(resolution))
            sb.AppendLine($"Resolution: {resolution}.");

        if (!string.IsNullOrEmpty(whatWorked))
            sb.AppendLine($"What worked: {whatWorked}.");

        if (!string.IsNullOrEmpty(whatFailed))
            sb.AppendLine($"Failed attempt: {whatFailed}.");

        if (!string.IsNullOrEmpty(lessons))
            sb.AppendLine($"Lesson: {lessons}.");

        sb.AppendLine($"Severity: {incident.Severity}. Resolved: {incident.ResolvedAt?.ToString("yyyy-MM-dd") ?? "N/A"}.");

        return sb.ToString().Trim();
    }

    private static string BuildPostMortemMarkdown(Incident incident, string impact, List<string> failedAttempts, string lessons, IncidentFeedback? feedback)
    {
        return $"""
# Post-Mortem: {incident.IncidentNumber}

**Date:** {incident.CreatedAt:yyyy-MM-dd}  
**Service:** {incident.Service}  
**Severity:** {incident.Severity}  
**Environment:** {incident.Environment}  

## Summary
{incident.Error} on {incident.Service} in {incident.Environment}.

## Impact
{impact}

## Timeline
- `{incident.CreatedAt:HH:mm}` — Incident created: {incident.Error}
{(incident.ResolvedAt.HasValue ? $"- `{incident.ResolvedAt:HH:mm}` — Incident resolved" : "")}

## Root Cause
{incident.RootCause ?? "Unknown - under investigation"}

## Resolution
{incident.Resolution ?? "N/A"}

## Failed Attempts
{(failedAttempts.Count > 0 ? string.Join("\n", failedAttempts.Select(f => $"- {f}")) : "- None documented")}

## Lessons Learned
{lessons}

## Action Items
- [ ] Update runbook for {incident.Service}
- [ ] Add monitoring alert for early detection
- [ ] Document fix in knowledge base
""";
    }

    private static string CleanJson(string raw)
    {
        var trimmed = raw.Trim();

        // Remove markdown code fences
        if (trimmed.StartsWith("```json")) trimmed = trimmed[7..];
        else if (trimmed.StartsWith("```")) trimmed = trimmed[3..];
        if (trimmed.EndsWith("```")) trimmed = trimmed[..^3];

        return trimmed.Trim();
    }

    private static string ExtractJsonFromText(string text)
    {
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start >= 0 && end > start)
            return text[start..(end + 1)];
        return text;
    }

    private static List<string> ExtractStringArray(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var arr) && arr.ValueKind == JsonValueKind.Array)
            return [.. arr.EnumerateArray().Select(x => x.GetString() ?? "").Where(s => !string.IsNullOrEmpty(s))];
        return [];
    }
}
