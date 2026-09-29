using Microsoft.AspNetCore.Mvc;
using RecallOps.Api.Services;

namespace RecallOps.Api.Controllers;

[ApiController]
[Route("api/memory")]
public class MemoryController : ControllerBase
{
    private readonly AgentService _agentService;

    public MemoryController(AgentService agentService)
    {
        _agentService = agentService;
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchMemory([FromQuery] string q, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { error = "Query parameter 'q' is required." });

        try
        {
            var results = await _agentService.SearchMemoryAsync(q, ct);
            return Ok(new { query = q, results, count = results.Count });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { error = "Memory search temporarily unavailable.", detail = ex.Message });
        }
    }

    [HttpGet("count")]
    public async Task<IActionResult> GetMemoryCount(CancellationToken ct)
    {
        var count = await _agentService.GetMemoryCountAsync(ct);
        return Ok(new { count });
    }
}
