namespace RecallOps.Api.Models;

public class IncidentFeedback
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string? RootCause { get; set; }
    public string? Resolution { get; set; }
    public string? WhatWorked { get; set; }
    public string? WhatFailed { get; set; }
    public string? LessonsLearned { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Incident Incident { get; set; } = null!;
}
