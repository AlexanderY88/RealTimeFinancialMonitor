# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY RealTimeFinancialMonitor.sln ./
COPY FinancialMonitor.Api/FinancialMonitor.Api.csproj ./FinancialMonitor.Api/
COPY FinancialMonitor.Tests/FinancialMonitor.Tests.csproj ./FinancialMonitor.Tests/

# Restore dependencies
RUN dotnet restore

# Copy all source files
COPY . .

# Build the application
WORKDIR /src/FinancialMonitor.Api
RUN dotnet build -c Release -o /app/build

# Publish the application
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published application from build stage
COPY --from=build /app/publish .

# Expose port 5143
EXPOSE 5143

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5143
ENV ASPNETCORE_ENVIRONMENT=Development

# Run the application
ENTRYPOINT ["dotnet", "FinancialMonitor.Api.dll"]
