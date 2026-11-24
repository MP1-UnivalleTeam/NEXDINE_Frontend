import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Menu from './pages/Menu.jsx'
import Productos from './pages/Productos.jsx'
import Mesas from './pages/Mesas.jsx'
import Sucursales from './pages/Sucursales.jsx'
import Carrito from './pages/Carrito.jsx'
import PedidoInvitado from './pages/PedidoInvitado.jsx'
import ResumenPedido from './pages/ResumenPedido.jsx'
import Pedidos from './pages/Pedidos.jsx'
import ParaLlevar from './pages/ParaLlevar.jsx'
import Domicilios from './pages/Domicilios.jsx'
import Favoritos from './pages/Favoritos.jsx'
import Impuestos from './pages/Impuestos.jsx'
import Reportes from './pages/Reportes.jsx'
import Recordatorios from './pages/Recordatorios.jsx'
import { CarritoProvider } from './context/CarritoContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function App() {
  return (
    <BrowserRouter>
      <CarritoProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/:slug" element={<Menu />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/para-llevar" element={<ParaLlevar />} />
            <Route path="/domicilios" element={<Domicilios />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/sucursales" element={<Sucursales />} />
            <Route path="/impuestos" element={<Impuestos />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/recordatorios" element={<Recordatorios />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/pedido" element={<PedidoInvitado />} />
            <Route path="/resumen/:pedidoId" element={<ResumenPedido />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ErrorBoundary>
      </CarritoProvider>
    </BrowserRouter>
  )
}

export default App
