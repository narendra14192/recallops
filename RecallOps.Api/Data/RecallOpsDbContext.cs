using Microsoft.EntityFrameworkCore;
using RecallOps.Api.Models;

namespace RecallOps.Api.Data;

public class RecallOpsDbContext : DbContext
{
    public RecallOpsDbContext(DbContextOptions<RecallOpsDbContext> options) : base(options) { }

    public DbSet<Incident> Incidents => Set<Incident>();
    public DbSet<IncidentEvent> IncidentEvents => Set<IncidentEvent>();
    public DbSet<IncidentFeedback> IncidentFeedbacks => Set<IncidentFeedback>();
    public DbSet<ServiceInfo> Services => Set<ServiceInfo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Incident>(e =>
        {
            e.HasKey(x => x.Id);
            if (Database.IsNpgsql())
            {
                e.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
                e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            }
            e.HasMany(x => x.Events).WithOne(x => x.Incident).HasForeignKey(x => x.IncidentId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Feedbacks).WithOne(x => x.Incident).HasForeignKey(x => x.IncidentId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.Service);
            e.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<IncidentEvent>(e =>
        {
            e.HasKey(x => x.Id);
            if (Database.IsNpgsql())
            {
                e.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
                e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            }
            e.HasIndex(x => x.IncidentId);
        });

        modelBuilder.Entity<IncidentFeedback>(e =>
        {
            e.HasKey(x => x.Id);
            if (Database.IsNpgsql())
            {
                e.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
                e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            }
        });

        modelBuilder.Entity<ServiceInfo>(e =>
        {
            e.HasKey(x => x.Id);
            if (Database.IsNpgsql())
            {
                e.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
                e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            }
        });

        // Seed default services
        var services = new[]
        {
            "Payment API", "Authentication API", "Order Service", "Notification Service",
            "User API", "Search Service", "API Gateway", "Redis Cache",
            "PostgreSQL Database", "File Storage Service"
        };

        foreach (var svc in services)
        {
            modelBuilder.Entity<ServiceInfo>().HasData(new ServiceInfo
            {
                Id = Guid.NewGuid(),
                Name = svc,
                Description = $"{svc} production service",
                Owner = "SRE Team",
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });
        }
    }
}
