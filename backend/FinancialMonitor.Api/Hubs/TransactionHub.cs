using Microsoft.AspNetCore.SignalR;

namespace FinancialMonitor.Api.Hubs;

/// <summary>
/// SignalR Hub for managing WebSocket connections and broadcasting real-time transaction updates to connected clients.
/// Clients connect to this hub to receive instant notifications when new transactions are processed.
/// </summary>
public class TransactionHub : Hub
{
    // Hub body is intentionally empty. 
    // Clients receive server-to-client broadcasts via IHubContext<TransactionHub>.
    // No client-to-server methods are needed for this use case.
}
