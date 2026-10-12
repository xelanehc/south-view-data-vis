import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import logo from './assets/southviewlogo.avif'
import MapView from './views/MapView'
import NetworkGraphView from './views/NetworkGraphView'

function App() {
  return (
    <div className="flex flex-col h-screen bg-sv-cream text-sv-text">
      <header className="flex items-center justify-between px-6 py-2 bg-sv-green-900 text-sv-green-100 shadow-md">
        <div className="flex items-center gap-3">
          <img src={logo} alt="South-View Cemetery" className="h-10 w-auto" />
          <h1 className="text-xl font-semibold tracking-tight">
            South-View Cemetery
          </h1>
        </div>
        <nav className="flex gap-1">
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sv-green-600 text-white'
                  : 'text-sv-green-100 hover:bg-sv-green-700 hover:text-white'
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
                  ? 'bg-sv-green-600 text-white'
                  : 'text-sv-green-100 hover:bg-sv-green-700 hover:text-white'
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
