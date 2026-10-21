import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AboutDialog from '@/components/AboutDialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import logo from './assets/southviewlogo.avif'
import MapView from './views/MapView'
import NetworkGraphView from './views/NetworkGraphView'

const NAV = [
  { to: '/map', label: 'Map' },
  { to: '/network', label: 'Network' },
]

function App() {
  const { pathname } = useLocation()
  const current = NAV.find((n) => pathname.startsWith(n.to))?.to ?? NAV[0].to

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4 md:px-6">
          <Link to="/map" className="flex items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden">
            <img src={logo} alt="Historic South-View Preservation Foundation" className="h-9 w-auto" />
          </Link>

          <Tabs value={current} className="ml-2">
            <TabsList>
              {NAV.map((n) => (
                <TabsTrigger key={n.to} value={n.to} asChild>
                  <Link to={n.to}>{n.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">Sample data</Badge>
            <AboutDialog />
          </div>
        </header>

        <main className="min-h-0 flex-1">
          <Routes>
            <Route path="/map" element={<MapView />} />
            <Route path="/network" element={<NetworkGraphView />} />
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </main>
      </div>
    </TooltipProvider>
  )
}

export default App
