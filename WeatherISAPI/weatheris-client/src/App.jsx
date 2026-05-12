import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Sensors from './pages/Sensors'
import History from './pages/History'
import Predictions from './pages/Predictions'
import MapView from './pages/MapView'
import Alerts from './pages/Alerts'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sensors" element={<Sensors />} />
          <Route path="history" element={<History />} />
          <Route path="predictions" element={<Predictions />} />
          <Route path="map" element={<MapView />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App