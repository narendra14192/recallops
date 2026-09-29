FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY ["RecallOps.Api/RecallOps.Api.csproj", "RecallOps.Api/"]
RUN dotnet restore "RecallOps.Api/RecallOps.Api.csproj"

# Copy full source and publish
COPY . .
WORKDIR "/src/RecallOps.Api"
RUN dotnet publish "RecallOps.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "RecallOps.Api.dll"]
