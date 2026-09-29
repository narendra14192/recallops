using RecallOps.Api.Data;
using RecallOps.Api.DTOs;
using RecallOps.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RecallOps.Api.Services;

public class IncidentService
{
    private readonly RecallOpsDbContext _db;
    private readonly ILogger<IncidentService> _logger;
    private static int _incidentCounter = 1000;

    public IncidentService(RecallOpsDbContext db, ILogger<IncidentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Incident> CreateAsync(CreateIncidentRequest req, bool isDemo = false, CancellationToken ct = default)
    {
        // Validate
        if (string.IsNullOrWhiteSpace(req.Service))
            throw new ValidationException("Service is required.");
        if (string.IsNullOrWhiteSpace(req.Error))
            throw new ValidationException("Error is required.");
        if (string.IsNullOrWhiteSpace(req.Environment))
            throw new ValidationException("Environment is required.");
        if (string.IsNullOrWhiteSpace(req.Severity))
            throw new ValidationException("Severity is required.");

        var validSeverities = new[] { "Low", "Medium", "High", "Critical" };
        if (!validSeverities.Contains(req.Severity, StringComparer.OrdinalIgnoreCase))
            throw new ValidationException($"Severity must be one of: {string.Join(", ", validSeverities)}");

        // Generate incident number if not provided
        string incidentNumber;
        if (!string.IsNullOrEmpty(req.IncidentNumber))
        {
            incidentNumber = req.IncidentNumber;
        }
        else
        {
            var count = await _db.Incidents.CountAsync(ct);
            var nextNum = 1000 + count + 1;
            incidentNumber = $"INC-{nextNum}";
        }

        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            IncidentNumber = incidentNumber,
            Service = req.Service,
            Severity = req.Severity,
            Environment = req.Environment,
            Error = req.Error,
            Description = req.Description,
            RecentChanges = req.RecentChanges,
            Logs = req.Logs,
            Symptoms = req.Symptoms,
            Status = "Investigating",
            CreatedAt = DateTime.UtcNow,
            IsDemo = isDemo
        };

        _db.Incidents.Add(incident);

        // Add created event
        _db.IncidentEvents.Add(new IncidentEvent
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            Type = "created",
            Message = $"Incident {incidentNumber} created: {req.Error} on {req.Service} ({req.Severity}, {req.Environment})",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Created incident {IncidentNumber}", incidentNumber);
        return incident;
    }

    public async Task<List<IncidentDto>> GetAllAsync(string? status = null, CancellationToken ct = default)
    {
        var query = _db.Incidents.AsQueryable();
        if (!string.IsNullOrEmpty(status))
            query = query.Where(i => i.Status == status);

        return await query
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => ToDto(i))
            .ToListAsync(ct);
    }

    public async Task<Incident?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Incidents.FindAsync([id], ct);

    public async Task<Incident> ResolveAsync(Guid id, ResolveIncidentRequest req, CancellationToken ct = default)
    {
        var incident = await _db.Incidents.FindAsync([id], ct)
            ?? throw new NotFoundException($"Incident {id} not found");

        incident.Status = req.Status;
        incident.RootCause = req.RootCause;
        incident.Resolution = req.Resolution;
        if (req.Status == "Resolved")
            incident.ResolvedAt = DateTime.UtcNow;

        _db.IncidentEvents.Add(new IncidentEvent
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            Type = "resolved",
            Message = $"Incident {incident.IncidentNumber} marked as {req.Status}. Root cause: {req.RootCause}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return incident;
    }

    public async Task<List<IncidentEventDto>> GetEventsAsync(Guid incidentId, CancellationToken ct = default)
        => await _db.IncidentEvents
            .Where(e => e.IncidentId == incidentId)
            .OrderBy(e => e.CreatedAt)
            .Select(e => new IncidentEventDto(e.Id, e.IncidentId, e.Type, e.Message, e.Metadata, e.CreatedAt))
            .ToListAsync(ct);

    public async Task<DashboardStats> GetDashboardStatsAsync(int memoryCount, CancellationToken ct = default)
    {
        var incidents = await _db.Incidents.ToListAsync(ct);

        var activeIncidents = incidents.Count(i => i.Status is "Investigating" or "Monitoring");
        var investigating = incidents.Count(i => i.Status == "Investigating");
        var monitoring = incidents.Count(i => i.Status == "Monitoring");
        var resolved = incidents.Count(i => i.Status == "Resolved");

        var recentIncidents = incidents
            .OrderByDescending(i => i.CreatedAt)
            .Take(10)
            .Select(i => new RecentIncidentDto(i.Id, i.IncidentNumber, i.Service, i.Severity, i.Status, i.Error, i.CreatedAt))
            .ToList();

        var topServices = incidents
            .GroupBy(i => i.Service)
            .Select(g => new ServiceIncidentCount(g.Key, g.Count()))
            .OrderByDescending(s => s.Count)
            .Take(5)
            .ToList();

        // Learned patterns = resolved incidents with feedback
        var learnedPatterns = await _db.IncidentFeedbacks.CountAsync(ct);

        return new DashboardStats(
            activeIncidents, investigating, monitoring, resolved,
            incidents.Count, memoryCount, learnedPatterns,
            "Live", false, recentIncidents, topServices
        );
    }

    public static IncidentDto ToDto(Incident i) => new(
        i.Id, i.IncidentNumber, i.Service, i.Severity, i.Environment,
        i.Error, i.Description, i.RecentChanges, i.Logs, i.Symptoms,
        i.Status, i.RootCause, i.Resolution, i.CreatedAt, i.ResolvedAt, i.IsDemo
    );
}

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}
