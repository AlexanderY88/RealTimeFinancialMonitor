using System.Collections.Concurrent;
using System.Globalization;
using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Storage;

/// <summary>
/// Implementation of ITransactionStorage using a thread-safe ConcurrentDictionary.
/// </summary>
public class InMemoryTransactionStorage : ITransactionStorage
{
    private readonly ConcurrentDictionary<Guid, Transaction> _transactions = new();

    /// <inheritdoc />
    public StorageResult AddOrUpdate(Transaction transaction)
    {
        bool wasAdded = false;
        
        _transactions.AddOrUpdate(
            transaction.TransactionId,
            // Add factory: called when key doesn't exist
            key =>
            {
                wasAdded = true;
                return transaction;
            },
            // Update factory: called when key exists
            (key, existingValue) => transaction);
        
        return wasAdded ? StorageResult.Added : StorageResult.Updated;
    }

    /// <inheritdoc />
    public IEnumerable<Transaction> GetAll(string? search = null)
    {
        var transactions = _transactions.Values;
        
        // Sanitize the search input
        var sanitizedSearch = SanitizeSearchInput(search);
        
        if (string.IsNullOrWhiteSpace(sanitizedSearch))
        {
            return transactions;
        }
        
        var searchLower = sanitizedSearch.ToLowerInvariant();
        
        // Normalize numeric search for amount matching
        var cleanNumericSearch = NormalizeNumericSearch(sanitizedSearch);
        var isNumericSearch = decimal.TryParse(cleanNumericSearch, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, 
            CultureInfo.InvariantCulture, out decimal targetAmount);
        
        return transactions.Where(t =>
            t.TransactionId.ToString().ToLowerInvariant().Contains(searchLower) ||
            MatchesAmount(t.Amount, searchLower, cleanNumericSearch, isNumericSearch, targetAmount) ||
            t.Status.ToString().ToLowerInvariant().Contains(searchLower)
        );
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

    /// <inheritdoc />
    public Transaction? GetById(Guid id)
    {
        return _transactions.TryGetValue(id, out var transaction) ? transaction : null;
    }
}
