namespace RecallOps.Api.Models;

public class IncidentEvent
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string Type { get; set; } = string.Empty; // created, memory_searched, memory_found, analyzed, resolved, feedback_saved, memory_stored
    public string Message { get; set; } = string.Empty;
    public string? Metadata { get; set; } // JSON string for additional data
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Incident Incident { get; set; } = null!;
}
