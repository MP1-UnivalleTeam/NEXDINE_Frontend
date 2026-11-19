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
import {
  actualizarEstadoCocina,
  listarPedidosCocina,
  listarPedidosDomicilio,
  listarPedidosParaLlevar
} from '../services/serviciosPedido.js'
import { listarNotificaciones } from '../services/notificaciones.js'
import {
  ESTADOS_ACTIVOS, ESTADOS_PEDIDO, normalizarEstado, etiquetaEstado
} from '../utils/pedidos.js'
import { colores, tarjeta, radios, btnGhost, estiloBadge, input } from '../styles/tokens.js'

const ROLES_PERSONAL = ['MESERO', 'COCINERO', 'ADMINISTRADOR', 'SUPERADMIN']
const ROLES_COCINA = ['COCINERO', 'ADMINISTRADOR', 'SUPERADMIN']

const TABS = [
  { id: 'activos', etiqueta: 'Activos', roles: ROLES_PERSONAL },
  { id: 'cocina', etiqueta: 'Cocina', roles: ROLES_COCINA },
  { id: 'para-llevar', etiqueta: 'Para llevar', roles: ROLES_PERSONAL },
  { id: 'domicilios', etiqueta: 'Domicilios', roles: ROLES_PERSONAL }
]

function transicionCocina(estado) {
  const normalizado = normalizarEstado(estado)
  if (normalizado === 'CONFIRMADO') return 'EN_PREPARACION'
  if (normalizado === 'EN_PREPARACION') return 'LISTO'
  return null
}

function Pedidos() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [mesas, setMesas] = useState([])
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('activos')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroEstadoServicio, setFiltroEstadoServicio] = useState('')
  const [filtroPagoServicio, setFiltroPagoServicio] = useState('')
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [actualizando, setActualizando] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [pedidosServicio, setPedidosServicio] = useState([])
  const [cargandoServicio, setCargandoServicio] = useState(false)
  const [errorServicio, setErrorServicio] = useState('')
  const [ultimaActualizacionServicio, setUltimaActualizacionServicio] = useState(null)
  const [pedidoPago, setPedidoPago] = useState(null)
  const [notificaciones, setNotificaciones] = useState([])
  const [errorNotificaciones, setErrorNotificaciones] = useState('')
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false)

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
      if (!ROLES_PERSONAL.includes(usuario?.rol)) {
        navigate(usuario?.rol === 'CLIENTE' ? '/menu' : '/login')
        return
      }
      setCurrentUser(usuario)
      if (usuario.rol !== 'COCINERO') {
        cargarMesas()
      }
      cargarNotificaciones()
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

  const nombresMesas = useMemo(() => {
    const mapa = {}
    mesas.forEach(mesa => { mapa[mesa.id] = mesa.nombre })
    return mapa
  }, [mesas])

  const cargarServicio = useCallback(async ({ silencioso = false } = {}) => {
    if (tab === 'activos') return
    if (!silencioso) setCargandoServicio(true)
    setErrorServicio('')
    try {
      const filtros = {
        estado: filtroEstadoServicio || undefined,
        pagoEstado: filtroPagoServicio || undefined
      }
      let datos
      if (tab === 'cocina') {
        datos = await listarPedidosCocina({ estado: filtroEstadoServicio || undefined })
      } else if (tab === 'para-llevar') {
        datos = await listarPedidosParaLlevar(filtros)
      } else {
        datos = await listarPedidosDomicilio(filtros)
      }
      setPedidosServicio(Array.isArray(datos) ? datos : [])
      setUltimaActualizacionServicio(new Date())
    } catch (err) {
      const estado = err.response?.status
      if (estado === 401) {
        setErrorServicio('Tu sesión expiró. Inicia sesión nuevamente.')
      } else if (estado === 403) {
        setErrorServicio(err.response?.data?.error || 'No tienes permisos para consultar estos pedidos.')
      } else if (estado === 400) {
        setErrorServicio(err.response?.data?.error || 'Los filtros seleccionados no son válidos.')
      } else {
        setErrorServicio('No se pudieron cargar los pedidos. Revisa la conexión e inténtalo de nuevo.')
      }
      setPedidosServicio([])
    } finally {
      if (!silencioso) setCargandoServicio(false)
    }
  }, [tab, filtroEstadoServicio, filtroPagoServicio])

  useEffect(() => {
    if (!currentUser || tab === 'activos') return undefined
    cargarServicio()
    const intervalo = setInterval(() => cargarServicio({ silencioso: true }), 20000)
    return () => clearInterval(intervalo)
  }, [currentUser, tab, cargarServicio])

  const cambiarTab = (nuevoTab) => {
    if (nuevoTab === tab) return
    setTab(nuevoTab)
    setFiltroEstadoServicio('')
    setFiltroPagoServicio('')
    setTextoBusqueda('')
    setSuccessMessage('')
    setErrorAccion('')
    setErrorServicio('')
  }

  const pedidosBase = tab === 'activos' ? pedidos : pedidosServicio

  const pedidosFiltrados = useMemo(() => {
    const texto = textoBusqueda.trim().toLowerCase()
    return pedidosBase.filter(pedido => {
      if (tab === 'activos') {
        if (filtroEstado !== 'TODOS' && normalizarEstado(pedido.estado) !== filtroEstado) return false
      } else {
        if (filtroEstadoServicio && normalizarEstado(pedido.estado) !== filtroEstadoServicio) return false
        if (filtroPagoServicio && (pedido.pagoEstado || 'PENDIENTE') !== filtroPagoServicio) return false
      }
      if (!texto) return true
      const mesa = nombresMesas[pedido.mesaId] || ''
      return [pedido.numeroSeguimiento, pedido.nombre, pedido.telefono, mesa]
        .filter(Boolean)
        .some(valor => String(valor).toLowerCase().includes(texto))
    })
  }, [pedidosBase, tab, filtroEstado, filtroEstadoServicio, filtroPagoServicio, textoBusqueda, nombresMesas])

  const contarEstado = (valor) => {
    if (valor === 'TODOS') return pedidos.length
    return pedidos.filter(pedido => normalizarEstado(pedido.estado) === valor).length
  }

  const recargarActual = () => {
    if (tab === 'activos') {
      recargar()
    } else {
      cargarServicio()
    }
    cargarNotificaciones()
  }

  const cambiarEstado = async (pedido, estado) => {
    if (actualizando) return
    setActualizando(pedido.id)
    setErrorAccion('')
    try {
      if (tab === 'cocina') {
        await actualizarEstadoCocina(pedido.id, estado)
      } else {
        await actualizarEstadoPedido(pedido.id, estado)
      }
      setSuccessMessage(`${pedido.numeroSeguimiento || 'Pedido'} actualizado a ${etiquetaEstado(estado).toLowerCase()}.`)
      if (tab === 'activos') {
        await recargar()
      } else {
        await cargarServicio({ silencioso: true })
      }
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      setErrorAccion(err.response?.data?.error || 'No fue posible actualizar el estado del pedido.')
      setTimeout(() => setErrorAccion(''), 5000)
    } finally {
      setActualizando(null)
    }
  }

  const pagoConfirmado = async (resumen) => {
    const referencia = resumen?.numeroSeguimiento || pedidoPago?.numeroSeguimiento || 'el pedido'
    setSuccessMessage(`Pago confirmado para ${referencia}.`)
    setPedidoPago(null)
    await cargarNotificaciones()
    if (tab === 'activos') {
      await recargar()
    } else {
      await cargarServicio({ silencioso: true })
    }
    setTimeout(() => setSuccessMessage(''), 4500)
  }

  const horaActualizacion = (tab === 'activos' ? ultimaActualizacion : ultimaActualizacionServicio)
    ? (tab === 'activos' ? ultimaActualizacion : ultimaActualizacionServicio)
      .toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  const cargandoActual = tab === 'activos' ? cargando : cargandoServicio
  const errorActual = tab === 'activos' ? error : errorServicio
  const tabsDisponibles = TABS.filter(opcion => opcion.roles.includes(currentUser?.rol))

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
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Pedidos</h2>
            <small style={{ color: colores.textoSuave }}>
              {pedidosBase.length === 0 ? 'Sin pedidos en esta vista' : `${pedidosBase.length} pedidos en esta vista`}
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
              tab === 'activos' && enTiempoReal ? colores.exitoFondo : colores.superficie,
              tab === 'activos' && enTiempoReal ? colores.exitoTexto : colores.textoSuave
            )}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: tab === 'activos' && enTiempoReal ? colores.exito : colores.textoSuaveClaro
              }} />
              {tab === 'activos' && enTiempoReal ? 'Tiempo real' : 'Sincronización cada 20 s'}
            </span>
            <button
              type="button"
              className="btn"
              onClick={recargarActual}
              disabled={cargandoActual}
              style={{ ...btnGhost, minHeight: '40px' }}
            >
              <FiRefreshCw style={{ marginRight: '6px' }} />
              {cargandoActual ? 'Actualizando…' : 'Actualizar'}
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

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {tabsDisponibles.map(opcion => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => cambiarTab(opcion.id)}
              style={tabEstilo(tab === opcion.id)}
            >
              {opcion.etiqueta}
            </button>
          ))}
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

        {(errorAccion || errorActual) && (
          <div role="alert" style={{
            ...tarjeta, padding: '12px 16px', marginBottom: '14px',
            backgroundColor: colores.errorFondo, color: colores.errorTexto,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', fontSize: '13.5px', flexWrap: 'wrap'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FiXCircle /> {errorAccion || errorActual}
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
          {tab === 'activos' ? (
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
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colores.textoSuave, fontSize: '12.5px' }}>
                Estado
                <select
                  value={filtroEstadoServicio}
                  onChange={(event) => setFiltroEstadoServicio(event.target.value)}
                  style={{ ...input, minHeight: '38px', height: '38px', padding: '0 8px' }}
                >
                  <option value="">Todos</option>
                  {ESTADOS_PEDIDO.map(estado => (
                    <option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>
                  ))}
                </select>
              </label>
              {tab !== 'cocina' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colores.textoSuave, fontSize: '12.5px' }}>
                  Pago
                  <select
                    value={filtroPagoServicio}
                    onChange={(event) => setFiltroPagoServicio(event.target.value)}
                    style={{ ...input, minHeight: '38px', height: '38px', padding: '0 8px' }}
                  >
                    <option value="">Todos</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="PAGADO">Pagado</option>
                  </select>
                </label>
              )}
            </div>
          )}
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

        {cargandoActual && pedidosBase.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <div className="spinner-border" style={{ color: colores.primario }}></div>
            <div style={{ marginTop: '10px', fontSize: '13px' }}>Cargando pedidos…</div>
          </div>
        ) : pedidosBase.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiInbox style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 700, color: colores.texto, marginTop: '8px' }}>
              {tab === 'cocina'
                ? 'No hay pedidos en cocina'
                : tab === 'para-llevar'
                  ? 'No hay pedidos para llevar'
                  : tab === 'domicilios'
                    ? 'No hay pedidos a domicilio'
                    : 'No hay pedidos activos'}
            </div>
            <small>
              {tab === 'activos'
                ? 'Los pedidos entregados o cancelados dejan de aparecer en esta lista.'
                : 'La vista se actualiza automáticamente cada 20 segundos.'}
            </small>
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
                  onGestionarPago={tab === 'cocina'
                    ? undefined
                    : (seleccionado) => setPedidoPago(seleccionado)}
                  actualizando={actualizando === pedido.id}
                  permitirAcciones={tab === 'cocina' ? ROLES_COCINA.includes(currentUser.rol) : true}
                  permitirCancelar={tab !== 'cocina'}
                  siguientePersonalizado={tab === 'cocina' ? transicionCocina(pedido.estado) : undefined}
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
          {tab === 'activos'
            ? (enTiempoReal
              ? 'Los cambios de estado se reciben en tiempo real desde el servidor.'
              : 'La lista se sincroniza automáticamente cada 15 segundos.')
            : 'La vista de servicio se sincroniza automáticamente cada 20 segundos.'}
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

function tabEstilo(activo) {
  return {
    minHeight: '40px',
    padding: '0 18px',
    borderRadius: radios.sm,
    border: activo ? `1px solid ${colores.primario}` : `1px solid ${colores.borde}`,
    backgroundColor: activo ? colores.primario : colores.tarjeta,
    color: activo ? '#FFF' : colores.texto,
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer'
  }
}

export default Pedidos
