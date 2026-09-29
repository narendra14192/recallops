using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace RecallOps.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Incidents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    IncidentNumber = table.Column<string>(type: "text", nullable: false),
                    Service = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    Environment = table.Column<string>(type: "text", nullable: false),
                    Error = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    RecentChanges = table.Column<string>(type: "text", nullable: true),
                    Logs = table.Column<string>(type: "text", nullable: true),
                    Symptoms = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RootCause = table.Column<string>(type: "text", nullable: true),
                    Resolution = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDemo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Incidents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Owner = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Services", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IncidentEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IncidentEvents_Incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalTable: "Incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IncidentFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    RootCause = table.Column<string>(type: "text", nullable: true),
                    Resolution = table.Column<string>(type: "text", nullable: true),
                    WhatWorked = table.Column<string>(type: "text", nullable: true),
                    WhatFailed = table.Column<string>(type: "text", nullable: true),
                    LessonsLearned = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IncidentFeedbacks_Incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalTable: "Incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Services",
                columns: new[] { "Id", "CreatedAt", "Description", "Name", "Owner" },
                values: new object[,]
                {
                    { new Guid("1071488b-beb5-4958-a719-9ec1bd57eef9"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Redis Cache production service", "Redis Cache", "SRE Team" },
                    { new Guid("13fffe69-0d8e-44c8-a237-3c8681583c8b"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Payment API production service", "Payment API", "SRE Team" },
                    { new Guid("1982fcc4-5bcb-4bcc-b53e-772265942c97"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Search Service production service", "Search Service", "SRE Team" },
                    { new Guid("33fd9c1a-5eb1-4d57-a549-4abe39e2d5ea"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Order Service production service", "Order Service", "SRE Team" },
                    { new Guid("661d2385-fe06-42c3-bb81-0584256e0ba7"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Notification Service production service", "Notification Service", "SRE Team" },
                    { new Guid("6736f8cc-070a-4548-9d7c-99bc58f838ae"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Authentication API production service", "Authentication API", "SRE Team" },
                    { new Guid("8cd9a3d5-a5a2-43cd-8ca2-dd856a084df4"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "PostgreSQL Database production service", "PostgreSQL Database", "SRE Team" },
                    { new Guid("9915d5bf-e41a-48ce-98ed-63fe8e6b5a3e"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "API Gateway production service", "API Gateway", "SRE Team" },
                    { new Guid("a7a19fbf-d508-4903-bce1-114284db05c7"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "User API production service", "User API", "SRE Team" },
                    { new Guid("c8043c74-bfea-4b5f-80ec-3d6072344239"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "File Storage Service production service", "File Storage Service", "SRE Team" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_IncidentEvents_IncidentId",
                table: "IncidentEvents",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentFeedbacks_IncidentId",
                table: "IncidentFeedbacks",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_CreatedAt",
                table: "Incidents",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_Service",
                table: "Incidents",
                column: "Service");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_Status",
                table: "Incidents",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IncidentEvents");

            migrationBuilder.DropTable(
                name: "IncidentFeedbacks");

            migrationBuilder.DropTable(
                name: "Services");

            migrationBuilder.DropTable(
                name: "Incidents");
        }
    }
}
