import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Menu from './pages/Menu.jsx'
import Productos from './pages/Productos.jsx'
import Mesas from './pages/Mesas.jsx'
import Sucursales from './pages/Sucursales.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/menu/:slug" element={<Menu />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/mesas" element={<Mesas />} />
        <Route path="/sucursales" element={<Sucursales />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
