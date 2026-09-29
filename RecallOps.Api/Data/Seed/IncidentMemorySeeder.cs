using RecallOps.Api.Hindsight;
using RecallOps.Api.Services;

namespace RecallOps.Api.Data.Seed;

/// <summary>
/// Seeds ~25 realistic historical incidents into Hindsight memory bank.
/// Note: Does NOT include Payment API 502 caused by connection pool exhaustion (reserved for the demo).
/// </summary>
public class IncidentMemorySeeder
{
    private readonly IHindsightClient _hindsight;
    private readonly ILogger<IncidentMemorySeeder> _logger;
    private const string BankId = "recallops-incidents";

    public IncidentMemorySeeder(IHindsightClient hindsight, ILogger<IncidentMemorySeeder> logger)
    {
        _hindsight = hindsight;
        _logger = logger;
    }

    public static readonly SeedIncident[] SeedIncidents =
    [
        // Payment API (unrelated to connection pool - cert expiry)
        new("INC-1001", "Payment API", "Critical", "Production",
            "SSL Certificate Error", "SSL/TLS handshake failure on payment gateway endpoint",
            "Upgraded payment gateway client library last week",
            "Root cause: SSL certificate expired on payment gateway vendor endpoint.",
            "Resolution: Renewed certificate with vendor and updated client certificate configuration.",
            "Failed attempt: Restarting payment service (certificate issue unrelated to service health).",
            "Lesson: Set up automated certificate expiry monitoring with 30-day alerts for Payment API.",
            ["payment-api", "ssl", "certificate", "critical"]),

        // Authentication API
        new("INC-1002", "Authentication API", "Critical", "Production",
            "401 Unauthorized Bulk Failures", "Widespread authentication failures across all services",
            "Rotated JWT signing keys as part of quarterly security review",
            "Root cause: JWT signing key rotation deployed without updating key verification configuration on dependent services.",
            "Resolution: Updated key verification configuration on all consumer services and performed rolling restart.",
            "Failed attempt: Reverting authentication service (keys were correct; consumers had stale key reference).",
            "Lesson: JWT key rotation requires coordinated deployment with all consumers. Use key versioning and overlap periods.",
            ["auth-api", "jwt", "authentication", "key-rotation"]),

        // Notification Service - queue consumer
        new("INC-1003", "Notification Service", "High", "Production",
            "Message Delivery Failure", "Email and SMS notifications not being delivered",
            "Deployed new Kubernetes node pool for notification workers",
            "Root cause: Queue consumer pods crashed due to missing environment variable in new node pool configuration.",
            "Resolution: Added missing SMTP_HOST environment variable to pod spec and redeployed.",
            "Failed attempt: Restarting queue consumers without fixing environment (pods kept crashing).",
            "Lesson: Validate all required environment variables in deployment pipeline before rollout.",
            ["notification", "queue", "consumer", "kubernetes"]),

        // Order Service - missing index
        new("INC-1004", "Order Service", "High", "Production",
            "High Latency", "Order lookup latency spiked from 50ms to 8000ms",
            "Ran database migration adding order history archive table",
            "Root cause: Database migration added archive table but removed index on orders.customer_id causing full table scans.",
            "Resolution: Recreated index concurrently: CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders(customer_id).",
            "Failed attempt: Scaling up Order Service replicas (bottleneck was DB query, not compute).",
            "Lesson: Always include index verification in migration scripts for high-traffic tables.",
            ["order-service", "database", "index", "latency", "migration"]),

        // Redis Cache - memory exhaustion
        new("INC-1005", "Redis Cache", "High", "Production",
            "Connection Timeout", "Redis connection timeouts across all services",
            "Increased session TTL from 2 hours to 24 hours for improved UX",
            "Root cause: Redis memory exhausted due to TTL increase causing too many cached sessions to accumulate simultaneously.",
            "Resolution: Set maxmemory policy to allkeys-lru and evicted stale data. Reduced session TTL to 4 hours.",
            "Failed attempt: Restarting Redis (data loss without maxmemory policy set would have caused cache stampede).",
            "Lesson: Always set Redis maxmemory and eviction policy. Monitor memory utilization when changing TTLs.",
            ["redis", "cache", "memory", "oom", "timeout"]),

        // API Gateway - upstream overload
        new("INC-1006", "API Gateway", "Critical", "Production",
            "504 Gateway Timeout", "All API calls timing out through the gateway",
            "Ran marketing campaign causing 10x traffic spike",
            "Root cause: API Gateway upstream timeout set too low (5s) for upstream services under high load. Services were responding but slowly.",
            "Resolution: Increased API Gateway upstream timeout to 30s and added circuit breaker rules. Scaled up upstream services.",
            "Failed attempt: Restarting API Gateway (issue was timeout config, not gateway health).",
            "Lesson: API Gateway timeouts should be tuned based on upstream p99 latency under load, not p50.",
            ["api-gateway", "timeout", "504", "circuit-breaker", "traffic"]),

        // User API - rate limiting
        new("INC-1007", "User API", "Medium", "Production",
            "429 Too Many Requests", "Users unable to complete sign-up flow",
            "Ran targeted email campaign driving 50k new sign-up attempts",
            "Root cause: Rate limiter configured at 100 req/min per IP blocked legitimate users behind shared NAT/proxy.",
            "Resolution: Switched rate limiting to per-account rather than per-IP and increased global limit.",
            "Failed attempt: Disabling rate limiter entirely (would have allowed bot attacks).",
            "Lesson: Rate limiting on shared IPs blocks legitimate users. Use account-level or token-bucket per user.",
            ["user-api", "rate-limiting", "429", "signup"]),

        // Search Service - memory leak
        new("INC-1008", "Search Service", "High", "Production",
            "Out of Memory", "Search service pods OOMKilled repeatedly",
            "Updated search index to include product descriptions (larger documents)",
            "Root cause: Lucene search index buffer not released after query, causing memory leak with larger documents.",
            "Resolution: Added query-level buffer limit and upgraded search library version that fixed the leak.",
            "Failed attempt: Increasing pod memory limit (only delayed the OOM crash).",
            "Lesson: Memory leaks require root cause fix, not just resource limit increases. Profile memory on library upgrades.",
            ["search", "oom", "memory-leak", "lucene"]),

        // PostgreSQL Database - connection limit
        new("INC-1009", "PostgreSQL Database", "Critical", "Production",
            "Max Connections Exceeded", "Database refusing new connections",
            "Deployed 5 new microservices all connecting to the main database",
            "Root cause: Total connection pool across all services exceeded PostgreSQL max_connections (100) after new deployments.",
            "Resolution: Deployed PgBouncer connection pooler. Reduced per-service pool size. Increased max_connections to 200.",
            "Failed attempt: Restarting PostgreSQL (connections reestablished immediately).",
            "Lesson: Use a connection pooler (PgBouncer) for multi-service architectures. Set max_connections budget per service.",
            ["postgresql", "connections", "pgbouncer", "database"]),

        // File Storage - disk space
        new("INC-1010", "File Storage Service", "High", "Production",
            "Disk Full Error", "File uploads failing with 500 errors",
            "Temporarily disabled cleanup job to avoid touching production data during migration",
            "Root cause: Scheduled cleanup job was disabled and disk reached 100% capacity with temporary upload files.",
            "Resolution: Manually cleaned temporary files, re-enabled cleanup job, added disk space alert at 80%.",
            "Failed attempt: Increasing instance size (disk was 100% full, new capacity still needed cleanup).",
            "Lesson: Never disable cleanup jobs without a time-boxed plan and disk space monitoring.",
            ["file-storage", "disk", "cleanup", "storage"]),

        // Order Service - deadlock
        new("INC-1011", "Order Service", "Medium", "Staging",
            "Database Deadlock", "Order creation failing intermittently",
            "Refactored order transaction to update inventory and payments simultaneously",
            "Root cause: Concurrent transactions acquiring locks in different order (inventory then payment vs payment then inventory) caused deadlocks.",
            "Resolution: Enforced consistent lock acquisition order: always inventory first, then payment.",
            "Failed attempt: Increasing transaction timeout (deadlocks retried and failed again).",
            "Lesson: Always acquire database locks in consistent order across all transactions to prevent deadlocks.",
            ["order-service", "deadlock", "database", "transaction"]),

        // Authentication API - token revocation
        new("INC-1012", "Authentication API", "Medium", "Production",
            "Stale Session Tokens", "Users still accessing system after account deactivation",
            "Switched from stateful sessions to stateless JWT tokens",
            "Root cause: JWT tokens are stateless; no token revocation mechanism. Deactivated users retained valid tokens.",
            "Resolution: Implemented token blacklist in Redis and added revocation check on each request.",
            "Failed attempt: Setting very short JWT expiry (1 minute) - degraded UX too severely.",
            "Lesson: Stateless JWTs require revocation mechanism for account deactivation/logout scenarios.",
            ["auth-api", "jwt", "token", "revocation", "security"]),

        // Search Service - index corruption
        new("INC-1013", "Search Service", "High", "Production",
            "Empty Search Results", "All search queries returning 0 results",
            "Ran search index rebuild over the weekend",
            "Root cause: Index rebuild failed midway due to storage timeout, leaving a corrupted partial index that was swapped live.",
            "Resolution: Rolled back to previous index snapshot and implemented index rebuild validation before swap.",
            "Failed attempt: Reindexing again without validation (same failure would occur).",
            "Lesson: Always validate index rebuild completion before swapping. Implement blue-green index deployment.",
            ["search", "index", "corruption", "rebuild"]),

        // Notification Service - third-party rate limit
        new("INC-1014", "Notification Service", "Medium", "Production",
            "Email Delivery Delay", "Transactional emails delayed by 4+ hours",
            "Increased email notification frequency for all users (daily digest changed to hourly)",
            "Root cause: SendGrid rate limit exceeded due to 10x increase in email volume from frequency change.",
            "Resolution: Implemented exponential backoff retry with queue prioritization. Upgraded SendGrid plan.",
            "Failed attempt: Simply retrying at maximum rate (caused further rate limiting).",
            "Lesson: Third-party API rate limits must be calculated before changing notification frequency.",
            ["notification", "email", "rate-limit", "sendgrid"]),

        // API Gateway - configuration error
        new("INC-1015", "API Gateway", "Critical", "Production",
            "503 Service Unavailable", "All traffic returning 503 for specific API version",
            "Deployed new API version routing rules to API Gateway",
            "Root cause: Routing rule typo sent /api/v2/* traffic to /dev/null upstream instead of v2 service cluster.",
            "Resolution: Fixed routing rule and redeployed. Traffic restored in 2 minutes.",
            "Failed attempt: Restarting v2 service instances (routing was sending traffic to wrong target).",
            "Lesson: API Gateway routing changes must be tested in staging with traffic simulation before production.",
            ["api-gateway", "routing", "503", "configuration"]),

        // User API - schema migration
        new("INC-1016", "User API", "High", "Production",
            "500 Internal Server Error", "User profile updates failing",
            "Added new required field 'preferred_timezone' to user profile schema",
            "Root cause: New required column added without default value. Existing users missing the field cause NOT NULL constraint violations.",
            "Resolution: Added default value ('UTC') to column and backfilled existing records.",
            "Failed attempt: Rolling back API code (DB schema was already migrated in production).",
            "Lesson: Never add NOT NULL columns without default values. Use nullable or backfill strategy.",
            ["user-api", "schema", "migration", "null-constraint"]),

        // Redis Cache - eviction misconfiguration
        new("INC-1017", "Redis Cache", "Medium", "Production",
            "Cache Miss Storm", "Cache hit rate dropped from 95% to 12%",
            "Deployed application update with new cache key format",
            "Root cause: New cache key format invalidated all existing cached data simultaneously causing cache stampede.",
            "Resolution: Implemented cache warming with gradual migration period and dual-key support.",
            "Failed attempt: Flushing old cache manually (accelerated stampede rather than mitigating it).",
            "Lesson: Cache key format changes need migration strategy. Use versioned keys with warm-up period.",
            ["redis", "cache", "stampede", "key-migration"]),

        // PostgreSQL Database - vacuum bloat
        new("INC-1018", "PostgreSQL Database", "Medium", "Production",
            "Slow Queries", "Query performance degraded by 300% on high-traffic tables",
            "Disabled autovacuum during peak hours to reduce I/O",
            "Root cause: Table bloat from disabled autovacuum. TOAST entries accumulated, causing large sequential scans.",
            "Resolution: Re-enabled autovacuum, ran manual VACUUM ANALYZE on affected tables. Created vacuum schedule.",
            "Failed attempt: Adding indexes (did not help because statistics were stale).",
            "Lesson: Never disable autovacuum in production. Use cost-based autovacuum settings to minimize impact.",
            ["postgresql", "vacuum", "bloat", "performance"]),

        // File Storage - permissions error
        new("INC-1019", "File Storage Service", "Medium", "Production",
            "403 Forbidden", "User unable to download their files",
            "Migrated file storage to new S3 bucket for cost optimization",
            "Root cause: New bucket IAM policy did not replicate user-level ACLs from old bucket.",
            "Resolution: Applied user-specific ACL migration script and updated IAM policy to include user-scoped permissions.",
            "Failed attempt: Making bucket public (unacceptable security risk).",
            "Lesson: S3 bucket migrations must include ACL validation step. Never sacrifice security for quick fixes.",
            ["file-storage", "s3", "iam", "permissions", "403"]),

        // Order Service - queue buildup
        new("INC-1020", "Order Service", "High", "Production",
            "Order Processing Delay", "Orders stuck in processing state for 30+ minutes",
            "Deployed order processing service update during business hours",
            "Root cause: Rolling deployment caused temporary queue consumer gap where orders queued but were not processed.",
            "Resolution: Drained queue with emergency consumer instances. Implemented zero-downtime deployment with overlapping consumers.",
            "Failed attempt: Restarting just the failed instances (missed that queue had backlog from deployment gap).",
            "Lesson: Stateful queue consumers need zero-downtime deployment strategy with backlog monitoring.",
            ["order-service", "queue", "deployment", "backlog"]),

        // Payment API - certificate pinning
        new("INC-1021", "Payment API", "Critical", "Production",
            "Payment Gateway Rejection", "All payment transactions rejected by gateway",
            "Upgraded payment gateway SDK to latest version",
            "Root cause: New SDK version changed certificate pinning hashes. Production environment had old pinned certificate hashes.",
            "Resolution: Updated certificate pinning configuration with new hashes from gateway documentation.",
            "Failed attempt: Downgrading SDK (caused different compatibility errors).",
            "Lesson: Read SDK upgrade notes for security configuration changes. Test payment flows end-to-end in staging.",
            ["payment-api", "certificate-pinning", "sdk", "upgrade"]),

        // Search Service - CPU spike
        new("INC-1022", "Search Service", "High", "Production",
            "High CPU Utilization", "Search latency at 15+ seconds, CPU at 100%",
            "Added fuzzy search with Levenshtein distance across all string fields",
            "Root cause: Fuzzy matching on all fields without index support caused O(n*m) computation on every query.",
            "Resolution: Limited fuzzy search to name/title fields only, implemented field-level result boosting.",
            "Failed attempt: Horizontal scaling (CPU was still maxed per instance).",
            "Lesson: Fuzzy/approximate matching is expensive. Apply only to indexed fields and limit distance threshold.",
            ["search", "cpu", "performance", "fuzzy-search"]),

        // Authentication API - replay attack
        new("INC-1023", "Authentication API", "Critical", "Production",
            "Suspicious Authentication Activity", "Multiple accounts accessed from impossible geographic locations",
            "None - detected during security audit",
            "Root cause: JWT tokens stolen from insecure client-side storage (localStorage) and used from different locations.",
            "Resolution: Migrated tokens to httpOnly cookies, implemented IP binding for admin sessions, added device fingerprinting.",
            "Failed attempt: IP-based blocking (attackers used VPN to match original IP).",
            "Lesson: Never store JWTs in localStorage. Use httpOnly cookies. Implement behavioral anomaly detection.",
            ["auth-api", "security", "jwt", "replay-attack", "token-theft"]),

        // Notification Service - dependency failure
        new("INC-1024", "Notification Service", "Medium", "Production",
            "Push Notification Failure", "Mobile push notifications not delivered",
            "Firebase Cloud Messaging (FCM) platform had minor service disruption",
            "Root cause: FCM service disruption caused delivery failures. No fallback notification mechanism existed.",
            "Resolution: Implemented SMS fallback for critical notifications when push delivery fails.",
            "Failed attempt: Retrying immediately (FCM still down, queue grew further).",
            "Lesson: Implement fallback delivery channels for critical notifications. Monitor third-party provider status pages.",
            ["notification", "push", "fcm", "dependency", "fallback"]),

        // API Gateway - SSL termination
        new("INC-1025", "API Gateway", "High", "Production",
            "Mixed Content Errors", "Web clients reporting mixed content warnings blocking resources",
            "Added new API endpoints served from a microservice not behind the gateway",
            "Root cause: New microservice exposed HTTP endpoints directly without going through SSL-terminating API Gateway.",
            "Resolution: Routed all microservice traffic through API Gateway. Enforced HTTPS-only policy.",
            "Failed attempt: Setting HSTS header (did not fix existing HTTP endpoint exposure).",
            "Lesson: All service endpoints must be routed through API Gateway. Enforce TLS at gateway level, never bypass.",
            ["api-gateway", "ssl", "tls", "https", "security"]),
    ];

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Seeding {Count} historical incidents to Hindsight memory bank...", SeedIncidents.Length);
        int seeded = 0;

        foreach (var incident in SeedIncidents)
        {
            var memory = BuildMemory(incident);

            try
            {
                await _hindsight.RetainAsync(
                    BankId,
                    memory,
                    documentId: incident.IncidentNumber,
                    tags: incident.Tags,
                    cancellationToken: cancellationToken);

                seeded++;
                _logger.LogInformation("Seeded {IncidentNumber}", incident.IncidentNumber);

                // Small delay to avoid rate limits
                await Task.Delay(200, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to seed {IncidentNumber}", incident.IncidentNumber);
            }
        }

        _logger.LogInformation("Seeded {Seeded}/{Total} incidents to Hindsight", seeded, SeedIncidents.Length);
    }

    private static string BuildMemory(SeedIncident incident) => $"""
Incident {incident.IncidentNumber} on {incident.Service} ({incident.Environment}): {incident.Error}.
Severity: {incident.Severity}.
Description: {incident.Description}
Recent change: {incident.RecentChange}
Root cause: {incident.RootCause}
Resolution: {incident.Resolution}
Failed attempt: {incident.FailedAttempt}
Lesson: {incident.Lesson}
""".Trim();
}

public record SeedIncident(
    string IncidentNumber,
    string Service,
    string Severity,
    string Environment,
    string Error,
    string Description,
    string RecentChange,
    string RootCause,
    string Resolution,
    string FailedAttempt,
    string Lesson,
    string[] Tags
);
