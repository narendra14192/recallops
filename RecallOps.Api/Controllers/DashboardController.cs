using Microsoft.AspNetCore.Mvc;
using RecallOps.Api.AI;
using RecallOps.Api.Data;
using RecallOps.Api.DTOs;
using RecallOps.Api.Hindsight;
using RecallOps.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace RecallOps.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IncidentService _incidentService;
    private readonly AgentService _agentService;
    private readonly IHindsightClient _hindsight;

    public DashboardController(IncidentService incidentService, AgentService agentService, IHindsightClient hindsight)
    {
        _incidentService = incidentService;
        _agentService = agentService;
        _hindsight = hindsight;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var memoryCount = await _agentService.GetMemoryCountAsync(ct);
        var stats = await _incidentService.GetDashboardStatsAsync(memoryCount, ct);

        // Add memory mode info
        var isFallback = _hindsight is FallbackHindsightClient f && f.IsUsingFallback;
        var enrichedStats = stats with { MemoryMode = _hindsight.Mode, MemoryFallbackActive = isFallback };

        return Ok(enrichedStats);
    }
}

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly IHindsightClient _hindsight;
    private readonly IGroqClient _groq;
    private readonly RecallOpsDbContext _db;

    public HealthController(IHindsightClient hindsight, IGroqClient groq, RecallOpsDbContext db)
    {
        _hindsight = hindsight;
        _groq = groq;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealth(CancellationToken ct)
    {
        bool dbHealthy, hindsightHealthy, groqHealthy;

        try
        {
            await _db.Database.CanConnectAsync(ct);
            dbHealthy = true;
        }
        catch { dbHealthy = false; }

        try { hindsightHealthy = await _hindsight.IsHealthyAsync(ct); }
        catch { hindsightHealthy = false; }

        try { groqHealthy = await _groq.IsHealthyAsync(ct); }
        catch { groqHealthy = false; }

        var isFallback = _hindsight is FallbackHindsightClient f && f.IsUsingFallback;
        var allHealthy = dbHealthy && groqHealthy; // Hindsight can be in local mode and still OK

        return Ok(new HealthResponse(
            Status: allHealthy ? "healthy" : "degraded",
            ApiHealthy: true,
            DatabaseHealthy: dbHealthy,
            HindsightHealthy: hindsightHealthy || isFallback, // local fallback counts
            GroqHealthy: groqHealthy,
            HindsightMode: _hindsight.Mode,
            HindsightFallbackActive: isFallback
        ));
    }
}
