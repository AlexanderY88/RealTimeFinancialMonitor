# MVP Blueprint: Real-Time Financial Monitor

## Tech Stack
- **Backend**: .NET 8/9, ASP.NET Core Web API, SignalR (or WebSockets) for real-time broadcast[cite: 2].
- **Frontend**: React, TypeScript[cite: 2].
- **Database/Storage**: In-Memory (RAM) using thread-safe collections (e.g., `ConcurrentDictionary`)[cite: 2].
- **Testing**: xUnit, FluentAssertions (following a TDD approach)[cite: 2].

## 1. Core Data Model (JSON Structure)
All transaction data must strictly adhere to this structure[cite: 2]:
{
  "transactionId": "guid-string", // Must be a valid Guid[cite: 2]
  "amount": 1500.50,             // Decimal, must be positive[cite: 2]
  "currency": "USD",             // String[cite: 2]
  "status": "Pending | Completed | Failed", // Enum: Pending=0, Completed=1, Failed=2[cite: 2]
  "timestamp": "2024-01-15T10:00:00Z" // DateTime (UTC)[cite: 2]
}

## 2. Backend Requirements (.NET)
- **Ingestion API**: POST endpoint at `/api/transactions` to accept transaction data[cite: 2].
- **Real-Time Layer**: SignalR Hub to broadcast incoming transactions instantly to all connected clients[cite: 2]. Must handle multiple concurrent connections thread-safely[cite: 2].
- **Storage**: In-memory `ConcurrentDictionary`. Avoid race conditions during parallel reads and writes[cite: 2].

## 3. Frontend Requirements (React + TS)
- **Route `/add` (Simulator)**: A form or "Generator" button that creates mock transactions and sends them to the Backend Ingestion API via HTTP POST[cite: 2].
- **Route `/monitor` (Live Dashboard)**: Connects to the SignalR Hub, renders incoming transactions in real-time, keeps UI responsive under heavy loads (up to 100+ rapid updates), shows distinct colors for transaction statuses, and allows basic client-side filtering (e.g., "Show only Errors")[cite: 2].

## 4. Tests (TDD)
- Unit tests must cover transaction processing, concurrent storage writes, and prevent race conditions[cite: 2].

## 5. DevOps & Architecture (Bonus)
- **Distributed Architecture**: Multi-pod sync logic (described in README via Pub/Sub like Redis)[cite: 2].
- **Docker**: Production-ready, optimized Dockerfile (multi-stage build)[cite: 2].
- **Kubernetes**: `deployment.yaml` and `service.yaml` manifests[cite: 2].