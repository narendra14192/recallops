using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecallOps.Api.Data;
using RecallOps.Api.Data.Seed;
using RecallOps.Api.Hindsight;

namespace RecallOps.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IncidentMemorySeeder _seeder;
    private readonly IHindsightClient _hindsight;
    private readonly RecallOpsDbContext _db;

    private const string BankId = "recallops-incidents";

    public AdminController(IncidentMemorySeeder seeder, IHindsightClient hindsight, RecallOpsDbContext db)
    {
        _seeder = seeder;
        _hindsight = hindsight;
        _db = db;
    }

    [HttpPost("seed-memory")]
    public async Task<IActionResult> SeedMemory(CancellationToken ct)
    {
        try
        {
            await _seeder.SeedAsync(ct);
            return Ok(new { success = true, message = $"Seeded {IncidentMemorySeeder.SeedIncidents.Length} historical incidents into Hindsight memory bank." });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("reset-demo")]
    public async Task<IActionResult> ResetDemo(CancellationToken ct)
    {
        try
        {
            // Delete demo incidents from PostgreSQL
            var demoIncidents = await _db.Incidents.Where(i => i.IsDemo).ToListAsync(ct);
            _db.Incidents.RemoveRange(demoIncidents);
            await _db.SaveChangesAsync(ct);

            // Clear Hindsight memory bank
            await _hindsight.DeleteBankAsync(BankId, ct);

            return Ok(new
            {
                success = true,
                message = $"Demo reset complete. Deleted {demoIncidents.Count} demo incidents and cleared memory bank. Re-seed with /api/admin/seed-memory."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }
}
