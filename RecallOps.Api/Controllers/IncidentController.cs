using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecallOps.Api.Data;
using RecallOps.Api.DTOs;
using RecallOps.Api.Hindsight;
using RecallOps.Api.Models;
using RecallOps.Api.Services;

namespace RecallOps.Api.Controllers;

[ApiController]
[Route("api/incidents")]
public class IncidentController : ControllerBase
{
    private readonly IncidentService _incidentService;
    private readonly AgentService _agentService;
    private readonly RecallOpsDbContext _db;

    public IncidentController(IncidentService incidentService, AgentService agentService, RecallOpsDbContext db)
    {
        _incidentService = incidentService;
        _agentService = agentService;
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateIncident([FromBody] CreateIncidentRequest req, CancellationToken ct)
    {
        try
        {
            var incident = await _incidentService.CreateAsync(req, ct: ct);
            return CreatedAtAction(nameof(GetIncident), new { id = incident.Id }, IncidentService.ToDto(incident));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetIncidents([FromQuery] string? status, CancellationToken ct)
    {
        var incidents = await _incidentService.GetAllAsync(status, ct);
        return Ok(incidents);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetIncident(Guid id, CancellationToken ct)
    {
        var incident = await _incidentService.GetByIdAsync(id, ct);
        if (incident == null) return NotFound(new { error = $"Incident {id} not found" });
        return Ok(IncidentService.ToDto(incident));
    }

    [HttpPost("{id:guid}/investigate")]
    public async Task<IActionResult> InvestigateIncident(Guid id, CancellationToken ct)
    {
        var incident = await _incidentService.GetByIdAsync(id, ct);
        if (incident == null) return NotFound(new { error = $"Incident {id} not found" });

        try
        {
            var result = await _agentService.InvestigateAsync(incident, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { error = "Investigation service temporarily unavailable.", detail = ex.Message });
        }
    }

    [HttpPost("{id:guid}/resolve")]
    public async Task<IActionResult> ResolveIncident(Guid id, [FromBody] ResolveIncidentRequest req, CancellationToken ct)
    {
        try
        {
            var incident = await _incidentService.ResolveAsync(id, req, ct);

            // Auto-retain to Hindsight when resolved
            if (req.Status == "Resolved")
            {
                _ = Task.Run(async () =>
                {
                    using var scope = HttpContext.RequestServices.CreateScope();
                    var agent = scope.ServiceProvider.GetRequiredService<AgentService>();
                    await agent.RetainIncidentMemoryAsync(incident);
                }, ct);
            }

            return Ok(IncidentService.ToDto(incident));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/feedback")]
    public async Task<IActionResult> SaveFeedback(Guid id, [FromBody] FeedbackRequest req, CancellationToken ct)
    {
        var incident = await _incidentService.GetByIdAsync(id, ct);
        if (incident == null) return NotFound(new { error = $"Incident {id} not found" });

        // Save to PostgreSQL
        var feedback = new IncidentFeedback
        {
            Id = Guid.NewGuid(),
            IncidentId = id,
            RootCause = req.RootCause,
            Resolution = req.Resolution,
            WhatWorked = req.WhatWorked,
            WhatFailed = req.WhatFailed,
            LessonsLearned = req.LessonsLearned,
            CreatedAt = DateTime.UtcNow
        };
        _db.IncidentFeedbacks.Add(feedback);

        // Update incident if feedback has new info
        if (!string.IsNullOrEmpty(req.RootCause) && string.IsNullOrEmpty(incident.RootCause))
            incident.RootCause = req.RootCause;
        if (!string.IsNullOrEmpty(req.Resolution) && string.IsNullOrEmpty(incident.Resolution))
            incident.Resolution = req.Resolution;

        _db.IncidentEvents.Add(new IncidentEvent
        {
            Id = Guid.NewGuid(),
            IncidentId = id,
            Type = "feedback_saved",
            Message = "Engineer feedback saved to PostgreSQL and being retained to Hindsight memory bank.",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        // Retain to Hindsight
        await _agentService.RetainIncidentMemoryAsync(incident, feedback, ct);

        return Ok(new { success = true, message = "Memory stored ✓", feedbackId = feedback.Id });
    }

    [HttpGet("{id:guid}/postmortem")]
    public async Task<IActionResult> GeneratePostMortem(Guid id, CancellationToken ct)
    {
        var incident = await _incidentService.GetByIdAsync(id, ct);
        if (incident == null) return NotFound(new { error = $"Incident {id} not found" });

        var feedback = await _db.IncidentFeedbacks.FirstOrDefaultAsync(f => f.IncidentId == id, ct);

        try
        {
            var postMortem = await _agentService.GeneratePostMortemAsync(incident, feedback, ct);
            return Ok(postMortem);
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { error = "Post-mortem generation temporarily unavailable.", detail = ex.Message });
        }
    }

    [HttpGet("{id:guid}/events")]
    public async Task<IActionResult> GetEvents(Guid id, CancellationToken ct)
    {
        var incident = await _incidentService.GetByIdAsync(id, ct);
        if (incident == null) return NotFound(new { error = $"Incident {id} not found" });

        var events = await _incidentService.GetEventsAsync(id, ct);
        return Ok(events);
    }
}
