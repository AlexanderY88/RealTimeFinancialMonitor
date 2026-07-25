using Microsoft.EntityFrameworkCore;
using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Storage;

/// <summary>
/// Database context for the Financial Monitor application.
/// Manages Transaction entities and their persistence.
/// </summary>
public class FinancialMonitorDbContext : DbContext
{
    public FinancialMonitorDbContext(DbContextOptions<FinancialMonitorDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Gets or sets the Transactions table.
    /// </summary>
    public DbSet<Transaction> Transactions { get; set; } = null!;

    /// <summary>
    /// Configures the entity models and their relationships.
    /// </summary>
    /// <param name="modelBuilder">The builder used to construct the model.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Transaction entity
        modelBuilder.Entity<Transaction>(entity =>
        {
            // Store TransactionStatus enum as string in database
            entity.Property(t => t.Status)
                .HasConversion<string>();

            // Set TransactionId as primary key
            entity.HasKey(t => t.TransactionId);
        });
    }
}
