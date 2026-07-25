using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Storage;
using Xunit;

namespace FinancialMonitor.Tests;

public class InMemoryTransactionStorageTests
{
    [Fact]
    public void AddAndRetrieve_ShouldSucceed()
    {
        // Arrange
        var storage = new InMemoryTransactionStorage();
        var transaction = new Transaction
        {
            TransactionId = Guid.NewGuid(),
            Amount = 100.50m,
            Currency = "USD",
            Status = TransactionStatus.Pending,
            Timestamp = DateTime.UtcNow
        };

        // Act
        var result = storage.AddOrUpdate(transaction);
        var retrieved = storage.GetById(transaction.TransactionId);
        var all = storage.GetAll();

        // Assert
        Assert.Equal(StorageResult.Added, result);
        Assert.NotNull(retrieved);
        Assert.Equal(transaction.TransactionId, retrieved.TransactionId);
        Assert.Contains(transaction, all);
    }

    [Fact]
    public void AddOrUpdate_ShouldUpdateExistingTransaction()
    {
        // Arrange
        var storage = new InMemoryTransactionStorage();
        var transactionId = Guid.NewGuid();
        var transaction1 = new Transaction
        {
            TransactionId = transactionId,
            Amount = 100.50m,
            Currency = "USD",
            Status = TransactionStatus.Pending,
            Timestamp = DateTime.UtcNow
        };
        var transaction2 = new Transaction
        {
            TransactionId = transactionId,
            Amount = 200.00m,
            Currency = "EUR",
            Status = TransactionStatus.Completed,
            Timestamp = DateTime.UtcNow
        };

        // Act
        var firstResult = storage.AddOrUpdate(transaction1);
        var secondResult = storage.AddOrUpdate(transaction2);
        var retrieved = storage.GetById(transactionId);

        // Assert
        Assert.Equal(StorageResult.Added, firstResult);
        Assert.Equal(StorageResult.Updated, secondResult);
        Assert.Equal(1, storage.GetAll().Count());
        Assert.NotNull(retrieved);
        Assert.Equal(200.00m, retrieved.Amount);
        Assert.Equal(TransactionStatus.Completed, retrieved.Status);
    }

    [Fact]
    public void Concurrency_ShouldHandleMultipleWrites()
    {
        // Arrange
        var storage = new InMemoryTransactionStorage();
        int transactionCount = 100;

        // Act
        Parallel.For(0, transactionCount, i =>
        {
            var transaction = new Transaction
            {
                TransactionId = Guid.NewGuid(),
                Amount = 10.00m + i,
                Currency = "USD",
                Status = TransactionStatus.Completed,
                Timestamp = DateTime.UtcNow
            };
            storage.AddOrUpdate(transaction);
        });

        // Assert
        var allTransactions = storage.GetAll();
        Assert.Equal(transactionCount, allTransactions.Count());
    }
}
