import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Monitor from './pages/Monitor'

function App() {
  const [isConnected] = useState(true) // Connection status - will be dynamic with SignalR later

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Branding Logo & Title */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Financial Monitor
                </h1>
              </div>

              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="relative">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  {isConnected && (
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                  )}
                </div>
                <span className="text-sm font-medium text-slate-300">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto p-6 min-h-screen">
          <Routes>
            <Route path="/" element={<Monitor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
