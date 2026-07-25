using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Storage;

/// <summary>
/// Result of a storage operation.
/// </summary>
public enum StorageResult
{
    /// <summary>
    /// The transaction was added as a new entry.
    /// </summary>
    Added,

    /// <summary>
    /// The transaction was updated (replaced an existing entry).
    /// </summary>
    Updated
}

/// <summary>
/// Interface for thread-safe in-memory transaction storage.
/// </summary>
public interface ITransactionStorage
{
    /// <summary>
    /// Adds a new transaction or updates an existing one with the same ID.
    /// </summary>
    /// <param name="transaction">The transaction to add or update.</param>
    /// <returns>Added if the transaction was newly created; Updated if it replaced an existing transaction.</returns>
    StorageResult AddOrUpdate(Transaction transaction);

    /// <summary>
    /// Retrieves all stored transactions, optionally filtered by a search query.
    /// </summary>
    /// <param name="search">Optional search query to filter transactions by ID, amount, or status (case-insensitive).</param>
    /// <returns>An enumerable collection of all transactions matching the search criteria.</returns>
    IEnumerable<Transaction> GetAll(string? search = null);

    /// <summary>
    /// Retrieves a specific transaction by its ID.
    /// </summary>
    /// <param name="id">The unique identifier of the transaction.</param>
    /// <returns>The transaction if found; otherwise, null.</returns>
    Transaction? GetById(Guid id);
}
