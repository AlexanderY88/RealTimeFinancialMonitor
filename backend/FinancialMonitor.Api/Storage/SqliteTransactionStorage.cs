using Microsoft.EntityFrameworkCore;
using System.Globalization;
using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Storage;

/// <summary>
/// SQLite-based implementation of transaction storage using Entity Framework Core.
/// Provides persistent storage of transactions in a SQLite database file.
/// </summary>
public class SqliteTransactionStorage : ITransactionStorage
{
    private readonly FinancialMonitorDbContext _context;

    /// <summary>
    /// Initializes a new instance of SqliteTransactionStorage.
    /// Automatically creates the database file if it doesn't exist.
    /// </summary>
    /// <param name="context">The database context.</param>
    public SqliteTransactionStorage(FinancialMonitorDbContext context)
    {
        _context = context;
        // Create the database file on disk if it doesn't exist
        _context.Database.EnsureCreated();
    }

    /// <summary>
    /// Adds a new transaction or updates an existing one with the same ID.
    /// </summary>
    /// <param name="transaction">The transaction to add or update.</param>
    /// <returns>Added if the transaction was newly created; Updated if it replaced an existing transaction.</returns>
    public StorageResult AddOrUpdate(Transaction transaction)
    {
        // Check if transaction already exists
        var existing = _context.Transactions.Find(transaction.TransactionId);

        if (existing == null)
        {
            // Transaction doesn't exist - add it
            _context.Transactions.Add(transaction);
            _context.SaveChanges();
            return StorageResult.Added;
        }
        else
        {
            // Transaction exists - update it
            existing.Amount = transaction.Amount;
            existing.Currency = transaction.Currency;
            existing.Status = transaction.Status;
            existing.Timestamp = transaction.Timestamp;
            _context.SaveChanges();
            return StorageResult.Updated;
        }
    }

    /// <summary>
    /// Retrieves all stored transactions, optionally filtered by a search query.
    /// </summary>
    /// <param name="search">Optional search query to filter transactions by ID, amount, or status (case-insensitive).</param>
    /// <returns>An enumerable collection of all transactions matching the search criteria.</returns>
    public IEnumerable<Transaction> GetAll(string? search = null)
    {
        // Sanitize the search input
        var sanitizedSearch = SanitizeSearchInput(search);
        
        if (string.IsNullOrWhiteSpace(sanitizedSearch))
        {
            return _context.Transactions.AsNoTracking().ToList();
        }
        
        var searchLower = sanitizedSearch.ToLowerInvariant();
        
        // Normalize numeric search for amount matching
        var cleanNumericSearch = NormalizeNumericSearch(sanitizedSearch);
        var isNumericSearch = decimal.TryParse(cleanNumericSearch, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, 
            CultureInfo.InvariantCulture, out decimal targetAmount);
        
        // Use AsNoTracking for read-only queries to prevent memory leaks
        // Use AsEnumerable to perform filtering in memory
        // This ensures parameterized queries and prevents SQL injection
        return _context.Transactions
            .AsNoTracking()
            .AsEnumerable()
            .Where(t =>
                t.TransactionId.ToString().ToLowerInvariant().Contains(searchLower) ||
                MatchesAmount(t.Amount, searchLower, cleanNumericSearch, isNumericSearch, targetAmount) ||
                t.Status.ToString().ToLowerInvariant().Contains(searchLower)
            )
            .ToList();
    }

    /// <summary>
    /// Checks if a transaction amount matches the search criteria.
    /// Supports both exact decimal matching and partial string matching.
    /// </summary>
    private static bool MatchesAmount(decimal amount, string searchLower, string cleanNumericSearch, bool isNumericSearch, decimal targetAmount)
    {
        if (isNumericSearch)
        {
            // Exact amount match with tolerance for floating point precision
            if (Math.Abs(amount - targetAmount) < 0.001m)
            {
                return true;
            }
            
            // Partial string match using the clean numeric search
            if (amount.ToString(CultureInfo.InvariantCulture).Contains(cleanNumericSearch))
            {
                return true;
            }
        }
        
        // Fallback to standard formatted string matching
        return amount.ToString("F2").Contains(searchLower);
    }

    /// <summary>
    /// Normalizes a search string for numeric matching by removing currency symbols and thousands separators.
    /// </summary>
    /// <param name="search">The sanitized search input.</param>
    /// <returns>Normalized numeric string with currency symbols and separators removed.</returns>
    private static string NormalizeNumericSearch(string search)
    {
        // Remove currency symbols
        var normalized = search.Replace("$", "")
                              .Replace("€", "")
                              .Replace("₪", "")
                              .Replace("£", "")
                              .Replace("¥", "")
                              .Replace("₹", "");
        
        // Remove thousands separators (commas and spaces between digits)
        // Only remove if they appear to be part of a formatted number
        normalized = normalized.Replace(",", "");
        
        // Remove spaces that appear to be thousands separators
        // (this is a simple approach; more sophisticated logic could be added)
        if (normalized.Contains(".") || char.IsDigit(normalized.FirstOrDefault()))
        {
            normalized = normalized.Replace(" ", "");
        }
        
        return normalized;
    }

    /// <summary>
    /// Sanitizes search input to handle copy-pasted strings and prevent security issues.
    /// </summary>
    /// <param name="search">The raw search input.</param>
    /// <returns>Sanitized search string, or null if input is invalid.</returns>
    private static string? SanitizeSearchInput(string? search)
    {
        // Check if search is null or whitespace
        if (string.IsNullOrWhiteSpace(search))
        {
            return null;
        }

        // Trim leading and trailing whitespaces
        search = search.Trim();

        // Remove inner newlines, carriage returns, and tabs
        search = search.Replace("\r", "").Replace("\n", "").Replace("\t", "");

        // Limit max search string length to 100 characters to prevent DoS attacks
        if (search.Length > 100)
        {
            search = search.Substring(0, 100);
        }

        // Return null if after sanitization the string is empty
        return string.IsNullOrWhiteSpace(search) ? null : search;
    }

    /// <summary>
    /// Retrieves a specific transaction by its ID.
    /// </summary>
    /// <param name="id">The unique identifier of the transaction.</param>
    /// <returns>The transaction if found; otherwise, null.</returns>
    public Transaction? GetById(Guid id)
    {
        return _context.Transactions.AsNoTracking().FirstOrDefault(t => t.TransactionId == id);
    }
}
