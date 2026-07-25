using Microsoft.EntityFrameworkCore;
using FinancialMonitor.Api.Storage;
using FinancialMonitor.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. Read the provider from appsettings.json (defaults to "InMemory" if not specified)
var storageProvider = builder.Configuration["StorageSettings:Provider"] ?? "InMemory";

// 2. Register database or in-memory storage depending on the configuration
if (storageProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
{
    // Register SQLite database context
    builder.Services.AddDbContext<FinancialMonitorDbContext>(options =>
        options.UseSqlite("Data Source=financial_monitor.db"));

    // SQLite context lives within a single HTTP request, so we use Scoped
    builder.Services.AddScoped<ITransactionStorage, SqliteTransactionStorage>();
}
else
{
    // In-memory storage should be shared across the entire application, so we use Singleton
    builder.Services.AddSingleton<ITransactionStorage, InMemoryTransactionStorage>();
}

// 3. Configure CORS for the React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("CorsPolicy");

app.UseAuthorization();

app.MapControllers();
app.MapHub<TransactionHub>("/transactionHub");

app.Run();