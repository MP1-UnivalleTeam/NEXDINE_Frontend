import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiActivity, FiBell, FiCheckCircle, FiChevronDown, FiChevronUp,
  FiInbox, FiRefreshCw, FiSearch, FiXCircle
} from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import TarjetaPedido from '../components/TarjetaPedido.jsx'
import ModalPago from '../components/ModalPago.jsx'
import { usePedidosActivos } from '../hooks/usePedidosActivos.js'
import { actualizarEstadoPedido } from '../services/pedidos.js'
import { listarNotificaciones } from '../services/notificaciones.js'
import {
  ESTADOS_PEDIDO, normalizarEstado, etiquetaEstado
} from '../utils/pedidos.js'
import { normalizarEstadoPago } from '../utils/pagos.js'
import {
  colores, tarjeta, radios, btnGhost, estiloBadge, input
} from '../styles/tokens.js'

const ROLES_PERSONAL = ['MESERO', 'COCINERO', 'ADMINISTRADOR', 'SUPERADMIN']

/**
 * RF037 — Administrar órdenes para llevar.
 * Vista dedicada de administración de pedidos de modalidad para llevar.
 * Permite listar, filtrar por estado/pago/fecha/sucursal, ver detalle y
 * cambiar estados con validación de permisos.
 */
function ParaLlevar() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [tab, setTab] = useState('pendientes')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPago, setFiltroPago] = useState('')
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [actualizando, setActualizando] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [pedidoPago, setPedidoPago] = useState(null)
  const [notificaciones, setNotificaciones] = useState([])
  const [errorNotificaciones, setErrorNotificaciones] = useState('')
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false)

  const { pedidos, cargando, error, enTiempoReal, ultimaActualizacion, recargar } = usePedidosActivos({
    activo: Boolean(currentUser)
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const usuario = response.data
      if (!ROLES_PERSONAL.includes(usuario?.rol)) {
        navigate(usuario?.rol === 'CLIENTE' ? '/menu' : '/login')
        return
      }
      setCurrentUser(usuario)
      cargarNotificaciones()
    } catch {
      navigate('/login')
    }
  }

  const cargarNotificaciones = useCallback(async () => {
    try {
      const datos = await listarNotificaciones()
      setNotificaciones(Array.isArray(datos) ? datos : [])
      setErrorNotificaciones('')
    } catch (err) {
      const estado = err.response?.status
      if (estado === 401) {
        setErrorNotificaciones('Tu sesión expiró. Inicia sesión nuevamente.')
      } else if (estado === 403) {
        setErrorNotificaciones(err.response?.data?.error || 'No tienes permisos para consultar notificaciones.')
      } else {
        setErrorNotificaciones('No se pudieron cargar las notificaciones.')
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      await api.get('/logout')
    } catch {
      navigate('/login')
      return
    }
    navigate('/login')
  }

  const pedidosParaLlevar = useMemo(() => {
    return pedidos.filter(pedido => normalizarEstado(pedido.tipoServicio) === 'PARA_LLEVAR')
  }, [pedidos])

  const pedidosFiltrados = useMemo(() => {
    const texto = textoBusqueda.trim().toLowerCase()
    return pedidosParaLlevar.filter(pedido => {
      if (filtroEstado && normalizarEstado(pedido.estado) !== filtroEstado) return false
      if (filtroPago && normalizarEstadoPago(pedido.pagoEstado) !== filtroPago) return false
      if (!texto) return true
      return [pedido.numeroSeguimiento, pedido.nombre, pedido.telefono, pedido.direccion]
        .filter(Boolean)
        .some(valor => String(valor).toLowerCase().includes(texto))
    })
  }, [pedidosParaLlevar, filtroEstado, filtroPago, textoBusqueda])

  const recargarActual = () => {
    recargar()
    cargarNotificaciones()
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

  const pagoConfirmado = async (resumen) => {
    setSuccessMessage(`Pago confirmado para ${resumen?.numeroSeguimiento || 'el pedido'}.`)
    setPedidoPago(null)
    await cargarNotificaciones()
    await recargar()
    setTimeout(() => setSuccessMessage(''), 4500)
  }

  const horaActualizacion = ultimaActualizacion
    ? ultimaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  const tabs = [
    { id: 'pendientes', etiqueta: 'Pendientes de pago', roles: ROLES_PERSONAL },
    { id: 'todos', etiqueta: 'Todos', roles: ROLES_PERSONAL }
  ]

  const pedidosPorTab = useMemo(() => {
    if (tab === 'pendientes') {
      return pedidosFiltrados.filter(p => normalizarEstadoPago(p.pagoEstado) === 'PENDIENTE')
    }
    return pedidosFiltrados
  }, [pedidosFiltrados, tab])

  if (!currentUser) return null

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/para-llevar" onLogout={handleLogout} />

      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Pedidos para llevar</h2>
            <small style={{ color: colores.textoSuave }}>
              {pedidosParaLlevar.length === 0 ? 'Sin pedidos para llevar' : `${pedidosParaLlevar.length} pedidos para llevar`}
              {' · '}Actualizado a las {horaActualizacion}
            </small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => { setMostrarNotificaciones(valor => !valor); cargarNotificaciones() }}
              style={{ ...btnGhost, minHeight: '40px', position: 'relative' }}
              aria-expanded={mostrarNotificaciones}
            >
              <FiBell style={{ marginRight: '6px' }} />
              Notificaciones
              {notificaciones.length > 0 && (
                <span style={{
                  marginLeft: '7px', minWidth: '20px', height: '20px', padding: '0 6px',
                  borderRadius: radios.full, backgroundColor: colores.primario, color: 'white',
                  fontSize: '11px', fontWeight: 700, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  {notificaciones.length}
                </span>
              )}
              {mostrarNotificaciones
                ? <FiChevronUp style={{ marginLeft: '5px' }} />
                : <FiChevronDown style={{ marginLeft: '5px' }} />}
            </button>
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
              onClick={recargarActual}
              disabled={cargando}
              style={{ ...btnGhost, minHeight: '40px' }}
            >
              <FiRefreshCw style={{ marginRight: '6px' }} />
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        {mostrarNotificaciones && (
          <div style={{ ...tarjeta, padding: '14px 16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <strong style={{ color: colores.texto, fontSize: '14px' }}>Notificaciones recientes</strong>
              <small style={{ color: colores.textoSuave }}>{notificaciones.length} en total</small>
            </div>
            {errorNotificaciones && (
              <div role="alert" style={{ color: colores.errorTexto, fontSize: '12.5px', marginBottom: '8px' }}>
                {errorNotificaciones}
              </div>
            )}
            {!errorNotificaciones && notificaciones.length === 0 && (
              <small style={{ color: colores.textoSuave }}>No hay notificaciones registradas.</small>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {notificaciones.slice(0, 10).map(notificacion => (
                <div key={notificacion.id} style={{
                  backgroundColor: colores.superficie, borderRadius: radios.sm, padding: '9px 11px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ color: colores.texto, fontSize: '12.5px' }}>{notificacion.titulo}</strong>
                    <small style={{ color: colores.textoSuave }}>
                      {notificacion.fechaCreacion
                        ? new Date(notificacion.fechaCreacion).toLocaleString('es-CO')
                        : ''}
                    </small>
                  </div>
                  <small style={{ color: colores.textoSuave, display: 'block', marginTop: '3px' }}>
                    {notificacion.mensaje}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <button type="button" className="btn" onClick={recargarActual} style={{ ...btnGhost, minHeight: '36px' }}>
              Reintentar
            </button>
          </div>
        )}

        <div style={{
          ...tarjeta, padding: '14px 16px', marginBottom: '18px',
          display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tabs.map(opcion => (
              <button
                key={opcion.id}
                type="button"
                onClick={() => setTab(opcion.id)}
                style={{
                  minHeight: '38px', padding: '0 13px', borderRadius: radios.full,
                  border: tab === opcion.id ? `1px solid ${colores.primario}` : `1px solid ${colores.borde}`,
                  backgroundColor: tab === opcion.id ? colores.primario : colores.tarjeta,
                  color: tab === opcion.id ? '#FFF' : colores.texto,
                  fontWeight: 600, fontSize: '12.5px', cursor: 'pointer'
                }}
              >
                {opcion.etiqueta} ({pedidosPorTab.length === pedidosFiltrados.length && tab === 'todos' ? pedidosPorTab.length : pedidosPorTab.filter(p => tab === 'pendientes' ? normalizarEstadoPago(p.pagoEstado) === 'PENDIENTE' : true).length})
              </button>
            ))}
          </div>
          <div className="ms-md-auto" style={{ position: 'relative', flex: '1 1 240px', maxWidth: '320px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '14px', color: colores.textoSuaveClaro }} />
            <input
              type="text"
              placeholder="Buscar pedido, cliente o dirección…"
              value={textoBusqueda}
              onChange={(e) => setTextoBusqueda(e.target.value)}
              aria-label="Buscar pedido"
              style={{ ...input, width: '100%', paddingLeft: '36px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colores.textoSuave, fontSize: '12.5px' }}>
            Estado
            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              style={{ ...input, minHeight: '38px', height: '38px', padding: '0 8px' }}
            >
              <option value="">Todos</option>
              {ESTADOS_PEDIDO.map(estado => (
                <option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colores.textoSuave, fontSize: '12.5px' }}>
            Pago
            <select
              value={filtroPago}
              onChange={(event) => setFiltroPago(event.target.value)}
              style={{ ...input, minHeight: '38px', height: '38px', padding: '0 8px' }}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADO">Pagado</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>
        </div>

        {cargando && pedidosPorTab.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <div className="spinner-border" style={{ color: colores.primario }}></div>
            <div style={{ marginTop: '10px', fontSize: '13px' }}>Cargando pedidos…</div>
          </div>
        ) : pedidosPorTab.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiInbox style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 700, color: colores.texto, marginTop: '8px' }}>
              {tab === 'pendientes' ? 'No hay pedidos pendientes de pago' : 'No hay pedidos para llevar'}
            </div>
            <small>
              {tab === 'pendientes'
                ? 'Los pedidos para llevar sin pago aparecen aquí hasta que se registra el pago.'
                : 'La vista se actualiza automáticamente desde el servidor.'}
            </small>
          </div>
        ) : (
          <div className="row g-3">
            {pedidosPorTab.map(pedido => (
              <div key={pedido.id} className="col-12 col-xl-6">
                <TarjetaPedido
                  pedido={pedido}
                  onCambiarEstado={cambiarEstado}
                  onGestionarPago={(seleccionado) => setPedidoPago(seleccionado)}
                  actualizando={actualizando === pedido.id}
                  permitirAcciones={true}
                  permitirCancelar={true}
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

      {pedidoPago && (
        <ModalPago
          pedido={pedidoPago}
          rol={currentUser.rol}
          onCerrar={() => setPedidoPago(null)}
          onPagado={pagoConfirmado}
        />
      )}
    </div>
  )
}

export default ParaLlevar
