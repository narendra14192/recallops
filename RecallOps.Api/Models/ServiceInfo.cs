namespace RecallOps.Api.Models;

public class ServiceInfo
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Owner { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
