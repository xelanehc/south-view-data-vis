import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import MapView from './views/MapView'
import NetworkGraphView from './views/NetworkGraphView'

function App() {
  return (
    <div className="flex flex-col h-screen bg-stone-50 text-stone-800">
      <header className="flex items-center justify-between px-6 py-3 bg-stone-800 text-stone-100 shadow-md">
        <h1 className="text-xl font-semibold tracking-tight">
          South-View Cemetery
        </h1>
        <nav className="flex gap-1">
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-stone-600 text-white'
                  : 'text-stone-300 hover:bg-stone-700 hover:text-white'
              }`
            }
          >
            Map
          </NavLink>
          <NavLink
            to="/network"
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-stone-600 text-white'
                  : 'text-stone-300 hover:bg-stone-700 hover:text-white'
              }`
            }
          >
            Network Graph
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/map" element={<MapView />} />
          <Route path="/network" element={<NetworkGraphView />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
