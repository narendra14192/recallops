namespace RecallOps.Api.Models;

public class Incident
{
    public Guid Id { get; set; }
    public string IncidentNumber { get; set; } = string.Empty; // e.g. "INC-1087"
    public string Service { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty; // Low/Medium/High/Critical
    public string Environment { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RecentChanges { get; set; }
    public string? Logs { get; set; }
    public string? Symptoms { get; set; }
    public string Status { get; set; } = "Investigating"; // Investigating / Monitoring / Resolved
    public string? RootCause { get; set; }
    public string? Resolution { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public bool IsDemo { get; set; } = false;

    public ICollection<IncidentEvent> Events { get; set; } = [];
    public ICollection<IncidentFeedback> Feedbacks { get; set; } = [];
}
