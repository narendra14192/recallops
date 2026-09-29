using Microsoft.EntityFrameworkCore;
using RecallOps.Api.AI;
using RecallOps.Api.Data;
using RecallOps.Api.Data.Seed;
using RecallOps.Api.Hindsight;
using RecallOps.Api.Infrastructure;
using RecallOps.Api.Services;

// Auto-load root .env if present (local dev without committing secrets)
var envCandidates = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), ".env")
};
foreach (var candidate in envCandidates)
{
    if (File.Exists(candidate))
    {
        foreach (var line in File.ReadAllLines(candidate))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#") || !trimmed.Contains('=')) continue;
            var parts = trimmed.Split('=', 2);
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
        }
        break;
    }
}

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = null; // preserve PascalCase for DTOs
    });

builder.Services.AddEndpointsApiExplorer();

// Bind to Render / container PORT if set
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://*:{port}");
}

// CORS for React dev, Vercel deployments, and production clients
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Database configuration: Supports SQLite (zero-config local) and PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? "Data Source=recallops.db";

var isSqlite = connectionString.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase)
    || string.Equals(builder.Configuration["Database:Provider"], "Sqlite", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<RecallOpsDbContext>(options =>
{
    if (isSqlite)
    {
        options.UseSqlite(connectionString.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase) ? connectionString : "Data Source=recallops.db");
    }
    else
    {
        options.UseNpgsql(connectionString);
    }
});

// Hindsight configuration
var hindsightMode = builder.Configuration["Hindsight:Mode"] ?? "Local";

builder.Services.AddHttpClient<HindsightClient>();
builder.Services.AddSingleton<LocalMemoryClient>();

if (hindsightMode == "Live")
{
    builder.Services.AddSingleton<FallbackHindsightClient>();
    builder.Services.AddSingleton<IHindsightClient>(sp => sp.GetRequiredService<FallbackHindsightClient>());
    builder.Logging.AddFilter("RecallOps.Api.Hindsight", LogLevel.Information);
}
else
{
    builder.Services.AddSingleton<IHindsightClient>(sp => sp.GetRequiredService<LocalMemoryClient>());
}

// Groq AI
builder.Services.AddHttpClient<GroqClient>();
builder.Services.AddScoped<IGroqClient>(sp => sp.GetRequiredService<GroqClient>());

// App services
builder.Services.AddScoped<AgentService>();
builder.Services.AddScoped<IncidentService>();
builder.Services.AddScoped<IncidentMemorySeeder>();

var app = builder.Build();

// Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("ReactApp");
app.UseAuthorization();
app.MapControllers();

// Auto-migrate and seed on startup in Development
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RecallOpsDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        if (db.Database.IsSqlite())
        {
            logger.LogInformation("Using SQLite database. Ensuring schema is created...");
            await db.Database.EnsureCreatedAsync();
            logger.LogInformation("SQLite database schema ready.");
        }
        else
        {
            logger.LogInformation("Running PostgreSQL database migrations...");
            await db.Database.MigrateAsync();
            logger.LogInformation("Database migrations complete.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database initialization failed: {Message}", ex.Message);
    }
}

app.Run();
