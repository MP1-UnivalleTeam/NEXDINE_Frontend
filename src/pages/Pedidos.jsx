import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiRefreshCw, FiSearch, FiInbox, FiCheckCircle, FiXCircle, FiActivity } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import TarjetaPedido from '../components/TarjetaPedido.jsx'
import { usePedidosActivos } from '../hooks/usePedidosActivos.js'
import { actualizarEstadoPedido } from '../services/pedidos.js'
import { ESTADOS_ACTIVOS, normalizarEstado, etiquetaEstado } from '../utils/pedidos.js'
import { colores, tarjeta, radios, btnGhost, estiloBadge, input } from '../styles/tokens.js'

const ROLES_PERMITIDOS = ['MESERO', 'COCINERO', 'ADMINISTRADOR', 'SUPERADMIN']

function Pedidos() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [mesas, setMesas] = useState([])
  const [authLoading, setAuthLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [actualizando, setActualizando] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  const {
    pedidos, cargando, error, enTiempoReal, ultimaActualizacion, recargar
  } = usePedidosActivos({ activo: Boolean(currentUser) })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const usuario = response.data
      if (!ROLES_PERMITIDOS.includes(usuario?.rol)) {
        navigate(usuario?.rol === 'CLIENTE' ? '/menu' : '/login')
        return
      }
      setCurrentUser(usuario)
      if (usuario.rol !== 'COCINERO') {
        cargarMesas()
      }
    } catch {
      navigate('/login')
    } finally {
      setAuthLoading(false)
    }
  }

  const cargarMesas = async () => {
    try {
      const response = await api.get('/mesas')
      setMesas(Array.isArray(response.data) ? response.data : [])
    } catch {
      setMesas([])
    }
  }

  const handleLogout = async () => {
    try {
      await api.get('/logout')
    } catch {
      navigate('/login')
      return
    }
    navigate('/login')
  }

  const nombresMesas = useMemo(() => {
    const mapa = {}
    mesas.forEach(mesa => { mapa[mesa.id] = mesa.nombre })
    return mapa
  }, [mesas])

  const pedidosFiltrados = useMemo(() => {
    const texto = textoBusqueda.trim().toLowerCase()
    return pedidos.filter(pedido => {
      if (filtroEstado !== 'TODOS' && normalizarEstado(pedido.estado) !== filtroEstado) return false
      if (!texto) return true
      const mesa = nombresMesas[pedido.mesaId] || ''
      return [pedido.numeroSeguimiento, pedido.nombre, pedido.telefono, mesa]
        .filter(Boolean)
        .some(valor => String(valor).toLowerCase().includes(texto))
    })
  }, [pedidos, filtroEstado, textoBusqueda, nombresMesas])

  const contarEstado = (valor) => {
    if (valor === 'TODOS') return pedidos.length
    return pedidos.filter(pedido => normalizarEstado(pedido.estado) === valor).length
  }

  const cambiarEstado = async (pedido, estado) => {
    if (actualizando) return
    setActualizando(pedido.id)
    setErrorAccion('')
    try {
      await actualizarEstadoPedido(pedido.id, estado)
      setSuccessMessage(`${pedido.numeroSeguimiento || 'Pedido'} actualizado a ${etiquetaEstado(estado).toLowerCase()}.`)
      await recargar()
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      setErrorAccion(err.response?.data?.error || 'No fue posible actualizar el estado del pedido.')
      setTimeout(() => setErrorAccion(''), 5000)
    } finally {
      setActualizando(null)
    }
  }

  const horaActualizacion = ultimaActualizacion
    ? ultimaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/pedidos" onLogout={handleLogout} />

      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px', marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Pedidos activos</h2>
            <small style={{ color: colores.textoSuave }}>
              {pedidos.length === 0 ? 'Sin pedidos en curso' : `${pedidos.length} pedidos en curso`}
              {' · '}Actualizado a las {horaActualizacion}
            </small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={estiloBadge(
              enTiempoReal ? colores.exitoFondo : colores.superficie,
              enTiempoReal ? colores.exitoTexto : colores.textoSuave
            )}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: enTiempoReal ? colores.exito : colores.textoSuaveClaro
              }} />
              {enTiempoReal ? 'Tiempo real' : 'Sincronización cada 15 s'}
            </span>
            <button
              type="button"
              className="btn"
              onClick={recargar}
              disabled={cargando}
              style={{ ...btnGhost, minHeight: '40px' }}
            >
              <FiRefreshCw style={{ marginRight: '6px' }} />
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        {successMessage && (
          <div role="status" style={{
            ...tarjeta, padding: '12px 16px', marginBottom: '14px',
            backgroundColor: colores.exitoFondo, color: colores.exitoTexto,
            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px'
          }}>
            <FiCheckCircle /> {successMessage}
          </div>
        )}

        {(errorAccion || error) && (
          <div role="alert" style={{
            ...tarjeta, padding: '12px 16px', marginBottom: '14px',
            backgroundColor: colores.errorFondo, color: colores.errorTexto,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', fontSize: '13.5px', flexWrap: 'wrap'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FiXCircle /> {errorAccion || error}
            </span>
            <button type="button" className="btn" onClick={recargar} style={{ ...btnGhost, minHeight: '36px' }}>
              Reintentar
            </button>
          </div>
        )}

        <div style={{
          ...tarjeta, padding: '14px 16px', marginBottom: '18px',
          display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFiltroEstado('TODOS')}
              style={chipEstilo(filtroEstado === 'TODOS')}
            >
              Todos ({contarEstado('TODOS')})
            </button>
            {ESTADOS_ACTIVOS.map(estado => (
              <button
                key={estado.valor}
                type="button"
                onClick={() => setFiltroEstado(estado.valor)}
                style={chipEstilo(filtroEstado === estado.valor)}
              >
                {estado.etiqueta} ({contarEstado(estado.valor)})
              </button>
            ))}
          </div>
          <div className="ms-md-auto" style={{ position: 'relative', flex: '1 1 240px', maxWidth: '320px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '14px', color: colores.textoSuaveClaro }} />
            <input
              type="text"
              placeholder="Buscar pedido, cliente o mesa…"
              value={textoBusqueda}
              onChange={(e) => setTextoBusqueda(e.target.value)}
              aria-label="Buscar pedido"
              style={{ ...input, width: '100%', paddingLeft: '36px' }}
            />
          </div>
        </div>

        {cargando && pedidos.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <div className="spinner-border" style={{ color: colores.primario }}></div>
            <div style={{ marginTop: '10px', fontSize: '13px' }}>Cargando pedidos activos…</div>
          </div>
        ) : pedidos.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiInbox style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 700, color: colores.texto, marginTop: '8px' }}>No hay pedidos activos</div>
            <small>Los pedidos entregados o cancelados dejan de aparecer en esta lista.</small>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiSearch style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 700, color: colores.texto, marginTop: '8px' }}>Sin resultados</div>
            <small>Ningún pedido coincide con el filtro actual.</small>
          </div>
        ) : (
          <div className="row g-3">
            {pedidosFiltrados.map(pedido => (
              <div key={pedido.id} className="col-12 col-xl-6">
                <TarjetaPedido
                  pedido={pedido}
                  nombreMesa={nombresMesas[pedido.mesaId] || ''}
                  onCambiarEstado={cambiarEstado}
                  actualizando={actualizando === pedido.id}
                  permitirAcciones
                />
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: colores.textoSuave, fontSize: '12px', marginTop: '18px'
        }}>
          <FiActivity />
          {enTiempoReal
            ? 'Los cambios de estado se reciben en tiempo real desde el servidor.'
            : 'La lista se sincroniza automáticamente cada 15 segundos.'}
        </div>
      </div>
    </div>
  )
}

function chipEstilo(activo) {
  return {
    minHeight: '38px',
    padding: '0 13px',
    borderRadius: radios.full,
    border: activo ? `1px solid ${colores.primario}` : `1px solid ${colores.borde}`,
    backgroundColor: activo ? colores.primario : colores.tarjeta,
    color: activo ? '#FFF' : colores.texto,
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer'
  }
}

export default Pedidos
