using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using FinancialMonitor.Api.Hubs;
using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Storage;

namespace FinancialMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionStorage _storage;
    private readonly IHubContext<TransactionHub> _hubContext;

    public TransactionsController(ITransactionStorage storage, IHubContext<TransactionHub> hubContext)
    {
        _storage = storage;
        _hubContext = hubContext;
    }

    /// <summary>
    /// Accepts a new transaction and stores it in memory, or updates an existing one.
    /// Broadcasts the transaction to all connected SignalR clients in real-time.
    /// </summary>
    /// <param name="transaction">The transaction to add or update.</param>
    /// <returns>201 Created if newly added, 200 OK if updated.</returns>
    [HttpPost]
    public async Task<IActionResult> PostTransaction([FromBody] Transaction transaction)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = _storage.AddOrUpdate(transaction);

        // Broadcast transaction to all connected SignalR clients
        await _hubContext.Clients.All.SendAsync("ReceiveTransaction", transaction);

        if (result == StorageResult.Added)
        {
            return CreatedAtAction(
                nameof(GetTransaction),
                new { id = transaction.TransactionId },
                transaction);
        }

        return Ok(new
        {
            message = "Transaction updated successfully",
            transactionId = transaction.TransactionId,
            transaction
        });
    }

    /// <summary>
    /// Retrieves a transaction by its ID.
    /// </summary>
    /// <param name="id">The transaction ID.</param>
    /// <returns>200 OK with the transaction, or 404 Not Found.</returns>
    [HttpGet("{id}")]
    public IActionResult GetTransaction(Guid id)
    {
        var transaction = _storage.GetById(id);

        if (transaction == null)
        {
            return NotFound(new { error = "Transaction not found", transactionId = id });
        }

        return Ok(transaction);
    }

    /// <summary>
    /// Retrieves all transactions, optionally filtered by a search query.
    /// </summary>
    /// <param name="search">Optional search query to filter transactions by ID, amount, or status (case-insensitive).</param>
    /// <returns>200 OK with the list of all transactions matching the search criteria.</returns>
    [HttpGet]
    public IActionResult GetAllTransactions([FromQuery] string? search = null)
    {
        var transactions = _storage.GetAll(search);
        return Ok(transactions);
    }
}
