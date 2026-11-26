import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiClock, FiChevronRight, FiXCircle } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { UbicacionActual } from '../components/EncabezadoPagina.jsx'
import ModalCancelarPedido from '../components/ModalCancelarPedido.jsx'
import { listarMisPedidos, cancelarPedido } from '../services/pedidos.js'
import { infoEstado, etiquetaTipoServicio, contarProductos } from '../utils/pedidos.js'
import { formatearDinero } from '../utils/dinero.js'
import { colores, tarjeta, btnGhost, estiloBadge, cifrasTabulares } from '../styles/tokens.js'

const FILTROS = [
  { id: 'TODOS', etiqueta: 'Todos', filtro: () => true },
  { id: 'EN_CURSO', etiqueta: 'En curso', filtro: p => !['ENTREGADO', 'CANCELADO'].includes(p.estado) },
  { id: 'ENTREGADOS', etiqueta: 'Entregados', filtro: p => p.estado === 'ENTREGADO' },
  { id: 'CANCELADOS', etiqueta: 'Cancelados', filtro: p => p.estado === 'CANCELADO' }
]

/** RF010: historial de pedidos del cliente registrado. */
function MisPedidos() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [filtro, setFiltro] = useState('TODOS')
  const [cancelando, setCancelando] = useState(null)

  const cargar = async () => {
    try {
      setPedidos(await listarMisPedidos())
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible cargar tus pedidos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    api.get('/api/auth/me')
      .then(({ data }) => {
        if (data?.rol !== 'CLIENTE') {
          navigate(data?.rol === 'MESERO' ? '/mesas' : '/pedidos')
          return
        }
        setCurrentUser(data)
        cargar()
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  const handleLogout = async () => {
    try { await api.get('/logout') } catch { /* sesión ya cerrada */ }
    navigate('/login')
  }

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  const filtroActual = FILTROS.find(f => f.id === filtro) || FILTROS[0]
  const visibles = pedidos.filter(filtroActual.filtro)
  const totalGastado = pedidos.filter(p => p.estado !== 'CANCELADO' && p.estado !== 'PENDIENTE')
    .reduce((suma, p) => suma + (Number(p.total) || 0), 0)

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/mis-pedidos" onLogout={handleLogout} />
      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{ marginBottom: '20px' }}>
          <UbicacionActual />
          <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Mis pedidos</h2>
          <small style={{ color: colores.textoSuave }}>
            {pedidos.length === 0 ? 'Todavía no has hecho pedidos con tu cuenta' : `${pedidos.length} pedido(s) · ${formatearDinero(totalGastado)} en compras`}
          </small>
        </div>

        {error && <div role="alert" style={{ ...tarjeta, backgroundColor: colores.errorFondo, color: colores.errorTexto, padding: '12px 16px', marginBottom: '16px' }}>{error}</div>}
        {exito && <div role="status" style={{ ...tarjeta, backgroundColor: colores.exitoFondo, color: colores.exitoTexto, padding: '12px 16px', marginBottom: '16px' }}>{exito}</div>}

        {pedidos.length > 0 && (
          <div role="tablist" aria-label="Filtrar pedidos" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {FILTROS.map(f => {
              const activo = f.id === filtro
              return (
                <button key={f.id} type="button" role="tab" aria-selected={activo} onClick={() => setFiltro(f.id)} style={{
                  minHeight: '36px', padding: '0 14px', borderRadius: '9999px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  border: `1px solid ${activo ? colores.primario : colores.borde}`,
                  backgroundColor: activo ? colores.primario : colores.tarjeta, color: activo ? '#fff' : colores.texto
                }}>
                  {f.etiqueta} ({pedidos.filter(f.filtro).length})
                </button>
              )
            })}
          </div>
        )}

        {cargando ? (
          <div role="status" style={{ ...tarjeta, padding: '48px', textAlign: 'center' }}>
            <div className="spinner-border" style={{ color: colores.primario }}></div>
          </div>
        ) : visibles.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiClock style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} className="mb-2" />
            <div style={{ fontWeight: 600, color: colores.texto }}>
              {pedidos.length === 0 ? 'Aún no tienes pedidos' : 'No hay pedidos con este filtro'}
            </div>
            {pedidos.length === 0 && <small>Los pedidos que hagas con tu cuenta aparecerán aquí.</small>}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibles.map(p => {
              const estado = infoEstado(p.estado)
              return (
                <li key={p.id} style={{ ...tarjeta, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ color: colores.texto }}>{p.numeroSeguimiento || 'Pedido'}</strong>
                      <span style={estiloBadge(estado.fondo, estado.texto)}>{estado.etiqueta}</span>
                    </div>
                    <small style={{ color: colores.textoSuave, display: 'block' }}>
                      {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      {' · '}{etiquetaTipoServicio(p.tipoServicio)} · {contarProductos(p)} producto(s)
                    </small>
                    {p.estado === 'CANCELADO' && p.motivoCancelacion && (
                      <small style={{ color: colores.errorTexto }}>Motivo: {p.motivoCancelacion}</small>
                    )}
                  </div>
                  <strong style={{ color: colores.texto, ...cifrasTabulares }}>{formatearDinero(p.total)}</strong>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {p.cancelable && (
                      <button type="button" className="btn" onClick={() => setCancelando(p)} style={{ ...btnGhost, minHeight: '38px', fontSize: '13px', color: colores.errorTexto }}>
                        <FiXCircle style={{ marginRight: '5px' }} /> Cancelar
                      </button>
                    )}
                    <button type="button" className="btn" onClick={() => navigate(`/resumen/${p.id}`)} style={{ ...btnGhost, minHeight: '38px', fontSize: '13px' }}>
                      Ver detalle <FiChevronRight />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {cancelando && (
        <ModalCancelarPedido
          pedido={cancelando}
          motivosRapidos={['Me equivoqué en el pedido', 'Ya no lo necesito', 'Tarda demasiado']}
          pagado={['PAGADO', 'PARCIAL'].includes(String(cancelando.pagoEstado).toUpperCase())}
          avisoPago="Ya pagaste este pedido. El restaurante te contactará para devolverte el dinero a Nequi o a tu tarjeta."
          onCerrar={() => setCancelando(null)}
          onConfirmar={async (motivo) => {
            await cancelarPedido(cancelando.id, motivo)
            setCancelando(null)
            setExito(`Pedido ${cancelando.numeroSeguimiento || ''} cancelado.`)
            setTimeout(() => setExito(''), 4000)
            await cargar()
          }}
        />
      )}
    </div>
  )
}

export default MisPedidos
