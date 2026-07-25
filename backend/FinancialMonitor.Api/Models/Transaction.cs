using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FinancialMonitor.Api.Models;

/// <summary>
/// Status of a financial transaction.
/// </summary>
public enum TransactionStatus
{
    Pending = 0,
    Completed = 1,
    Failed = 2
}

/// <summary>
/// Represents a financial transaction in the system.
/// </summary>
public class Transaction
{
    [Required]
    public Guid TransactionId { get; set; }

    [Required]
    public decimal Amount { get; set; }

    [Required]
    [StringLength(3, MinimumLength = 3, ErrorMessage = "Currency must be a 3-letter code.")]
    public string Currency { get; set; } = string.Empty;

    [Required]
    [EnumDataType(typeof(TransactionStatus), ErrorMessage = "Status must be one of the defined values: Pending, Completed, Failed.")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public TransactionStatus Status { get; set; }

    [Required]
    public DateTime Timestamp { get; set; }
}
