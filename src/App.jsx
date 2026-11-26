import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import Reembolsos from './pages/Reembolsos.jsx'
import MisPedidos from './pages/MisPedidos.jsx'
import Perfil from './pages/Perfil.jsx'
import Horarios from './pages/Horarios.jsx'
import Inicio from './pages/Inicio.jsx'
import Cocina from './pages/Cocina.jsx'
import RutaProtegida, { RedireccionInicio } from './components/RutaProtegida.jsx'
import { MODULOS } from './config/navegacion.js'
import { CarritoProvider } from './context/CarritoContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function App() {
  return (
    <BrowserRouter>
      <CarritoProvider>
        <ErrorBoundary>
          <Routes>
            {/* Públicas: inicio de sesión, registro y flujo de pedido del cliente */}
            <Route path="/" element={<RedireccionInicio />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/:slug" element={<Menu />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/pedido" element={<PedidoInvitado />} />
            <Route path="/resumen/:pedidoId" element={<ResumenPedido />} />

            {/* Con sesión: cada módulo solo para los roles definidos en config/navegacion.js */}
            {[
              ['inicio', <Inicio />],
              ['pedidos', <Pedidos />],
              ['mesas', <Mesas />],
              ['paraLlevar', <ParaLlevar />],
              ['domicilios', <Domicilios />],
              ['cocina', <Cocina />],
              ['reportes', <Reportes />],
              ['reembolsos', <Reembolsos />],
              ['productos', <Productos />],
              ['usuarios', <Dashboard />],
              ['sucursales', <Sucursales />],
              ['horarios', <Horarios />],
              ['impuestos', <Impuestos />],
              ['recordatorios', <Recordatorios />],
              ['misPedidos', <MisPedidos />],
              ['favoritos', <Favoritos />],
              ['perfil', <Perfil />]
            ].map(([clave, pagina]) => (
              <Route
                key={clave}
                path={MODULOS[clave].ruta}
                element={<RutaProtegida roles={MODULOS[clave].roles}>{pagina}</RutaProtegida>}
              />
            ))}

            <Route path="*" element={<RedireccionInicio />} />
          </Routes>
        </ErrorBoundary>
      </CarritoProvider>
    </BrowserRouter>
  )
}

export default App
