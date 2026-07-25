/**
 * Transaction status enum matching the backend C# TransactionStatus enum.
 * Represents the current state of a financial transaction.
 */
export type TransactionStatus = 'Pending' | 'Completed' | 'Failed';

/**
 * Transaction interface matching the backend C# Transaction model.
 * Represents a financial transaction in the system.
 */
export interface Transaction {
  /**
   * Unique identifier for the transaction (GUID).
   */
  transactionId: string;

  /**
   * Transaction amount (can be positive or negative, e.g., +100 or -100).
   */
  amount: number;

  /**
   * Currency code (3-letter code, e.g., "USD", "EUR").
   */
  currency: string;

  /**
   * Current status of the transaction.
   */
  status: TransactionStatus;

  /**
   * Timestamp when the transaction was created or last updated (ISO 8601 format).
   */
  timestamp: string;
}
