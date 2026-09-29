namespace RecallOps.Api.DTOs;

public record CreateIncidentRequest(
    string Service,
    string Severity,
    string Environment,
    string Error,
    string? Description = null,
    string? RecentChanges = null,
    string? Logs = null,
    string? Symptoms = null,
    string? IncidentNumber = null
);

public record ResolveIncidentRequest(
    string RootCause,
    string Resolution,
    string Status = "Resolved" // Resolved or Monitoring
);

public record FeedbackRequest(
    string? RootCause,
    string? Resolution,
    string? WhatWorked,
    string? WhatFailed,
    string? LessonsLearned
);

public record InvestigationResponse(
    Guid IncidentId,
    string IncidentNumber,
    List<string> LikelyCauses,
    List<string> RecommendedChecks,
    List<HistoricalIncidentMatch> RelevantHistoricalIncidents,
    string SuggestedResolution,
    double Confidence,
    string Reasoning,
    List<string> Warnings,
    bool UsedMemory,
    string MemoryMode,
    bool MemoryFallbackActive = false
);

public record HistoricalIncidentMatch(
    string IncidentNumber,
    double Similarity,
    string RootCause,
    string Resolution,
    List<string> FailedAttempts
);

public record MemorySearchResult(
    string Content,
    string DocumentId,
    double Score,
    string[] Tags
);

public record DashboardStats(
    int ActiveIncidents,
    int InvestigatingIncidents,
    int MonitoringIncidents,
    int ResolvedIncidents,
    int TotalIncidents,
    int MemoryRecords,
    int LearnedPatterns,
    string MemoryMode,
    bool MemoryFallbackActive,
    List<RecentIncidentDto> RecentIncidents,
    List<ServiceIncidentCount> TopServices
);

public record RecentIncidentDto(
    Guid Id,
    string IncidentNumber,
    string Service,
    string Severity,
    string Status,
    string Error,
    DateTime CreatedAt
);

public record ServiceIncidentCount(
    string Service,
    int Count
);

public record IncidentDto(
    Guid Id,
    string IncidentNumber,
    string Service,
    string Severity,
    string Environment,
    string Error,
    string? Description,
    string? RecentChanges,
    string? Logs,
    string? Symptoms,
    string Status,
    string? RootCause,
    string? Resolution,
    DateTime CreatedAt,
    DateTime? ResolvedAt,
    bool IsDemo
);

public record IncidentEventDto(
    Guid Id,
    Guid IncidentId,
    string Type,
    string Message,
    string? Metadata,
    DateTime CreatedAt
);

public record PostMortemDto(
    string IncidentNumber,
    string Service,
    string Severity,
    string Environment,
    string Error,
    string Impact,
    string RootCause,
    string Resolution,
    List<string> FailedAttempts,
    string LessonsLearned,
    DateTime OccurredAt,
    DateTime? ResolvedAt,
    string? TimeToResolve,
    string GeneratedMarkdown
);

public record HealthResponse(
    string Status,
    bool ApiHealthy,
    bool DatabaseHealthy,
    bool HindsightHealthy,
    bool GroqHealthy,
    string HindsightMode,
    bool HindsightFallbackActive,
    string Version = "1.0.0"
);
