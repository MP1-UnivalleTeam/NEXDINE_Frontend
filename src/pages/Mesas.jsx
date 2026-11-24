import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiPlus, FiX, FiCheckCircle, FiXCircle, FiGrid, FiLink2, FiCopy, FiExternalLink,
  FiSearch, FiLock, FiClipboard, FiRefreshCw, FiActivity
} from 'react-icons/fi'
import { QRCodeSVG } from 'qrcode.react'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import TarjetaPedido from '../components/TarjetaPedido.jsx'
import ModalPedidoManual from '../components/ModalPedidoManual.jsx'
import { usePedidosActivos } from '../hooks/usePedidosActivos.js'
import { actualizarEstadoPedido } from '../services/pedidos.js'
import { etiquetaEstado } from '../utils/pedidos.js'
import { resumirPagosMesa } from '../utils/pagos.js'
import { formatearDinero } from '../utils/dinero.js'
import EstadoPagoBadge from '../components/EstadoPagoBadge.jsx'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, estiloBadge, input } from '../styles/tokens.js'

// "1" → "Mesa 1"; cualquier otro nombre se muestra tal cual.
const nombreMesa = (mesa) => {
  const nombre = String(mesa?.nombre || '').trim()
  return /^\d+$/.test(nombre) ? `Mesa ${nombre}` : nombre
}

// Número corto para el ícono del detalle ("Mesa 12" → "12").
const abreviaturaMesa = (mesa) => {
  const nombre = String(mesa?.nombre || '')
  const numero = nombre.match(/\d+/)
  return numero ? numero[0].slice(0, 3) : nombre.slice(0, 2).toUpperCase()
}

// Orden natural: Mesa 2 antes que Mesa 10.
const compararMesas = (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es', {
  numeric: true, sensitivity: 'base'
})

const estiloMesa = (mesa) => {
  if (!mesa.activa) {
    return { etiqueta: 'Inactiva', fondo: colores.superficie, borde: colores.textoSuaveClaro, texto: colores.textoSuave }
  }
  if (mesa.estado === 'OCUPADA') {
    return { etiqueta: 'Ocupada', fondo: colores.advertenciaFondo, borde: colores.advertencia, texto: colores.advertenciaTexto }
  }
  return { etiqueta: 'Libre', fondo: colores.mint, borde: colores.exito, texto: colores.exitoTexto }
}

function Mesas() {
  const [currentUser, setCurrentUser] = useState(null)
  const [mesas, setMesas] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const esSuperadmin = currentUser?.rol === 'SUPERADMIN'
  const esAdmin = currentUser?.rol === 'ADMINISTRADOR' || esSuperadmin
  const esMesero = currentUser?.rol === 'MESERO'

  const {
    pedidos, cargando: cargandoPedidos, error: errorPedidos,
    enTiempoReal, recargar: recargarPedidos
  } = usePedidosActivos({ activo: Boolean(currentUser) })

  // Mesa seleccionada para consultar y administrar sus órdenes activas.
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null)
  const [modalPedidoManual, setModalPedidoManual] = useState(false)
  const [pedidoActualizando, setPedidoActualizando] = useState(null)

  // Modal crear mesa
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({ nombre: '', sucursalId: '' })

  // Modal QR
  const [qrMesa, setQrMesa] = useState(null)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Enlace público del restaurante (RF002)
  const [enlacePublico, setEnlacePublico] = useState(null)
  const [copiado, setCopiado] = useState(false)

  // Filtros visuales (referencia Stitch): chips de estado + búsqueda
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [textoBusqueda, setTextoBusqueda] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!showCreateModal && !qrMesa && !mesaSeleccionada) return

    const manejarEscape = (evento) => {
      if (evento.key !== 'Escape') return
      // El modal de pedido manual gestiona su propio Escape.
      if (modalPedidoManual) return
      evento.preventDefault()
      if (qrMesa) {
        setQrMesa(null)
      } else if (showCreateModal) {
        closeCreateModal()
      } else {
        setMesaSeleccionada(null)
      }
    }

    window.addEventListener('keydown', manejarEscape)
    return () => window.removeEventListener('keydown', manejarEscape)
  }, [showCreateModal, qrMesa, mesaSeleccionada, modalPedidoManual])

  // RF049 — El estado de la mesa cambia cuando un pedido se crea, avanza o se
  // paga. No se añade polling propio: `usePedidosActivos` ya entrega los
  // cambios (SSE con respaldo). Solo se recarga la lista de mesas cuando la
  // firma de pedidos activos cambia de verdad.
  const firmaPedidosRef = useRef('')
  useEffect(() => {
    if (!currentUser) return
    const firma = pedidos
      .map(pedido => `${pedido.id}:${pedido.estado}:${pedido.pagoEstado || ''}`)
      .sort()
      .join('|')
    if (firma === firmaPedidosRef.current) return
    firmaPedidosRef.current = firma
    loadMesas()
  }, [pedidos, currentUser])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const usuario = response.data
      const rol = usuario?.rol

      if (rol !== 'ADMINISTRADOR' && rol !== 'SUPERADMIN' && rol !== 'MESERO') {
        navigate(
          rol === 'COCINERO'
            ? '/pedidos'
            : rol === 'CLIENTE'
              ? '/menu'
              : '/login'
        )
        return
      }

      setCurrentUser(usuario)

      if (rol === 'MESERO') {
        await loadMesas()
      } else {
        await Promise.all([loadMesas(), loadSucursales(), loadEnlacePublico()])
      }
    } catch (err) {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadMesas = async () => {
    try {
      const response = await api.get('/mesas')
      setMesas(response.data)
      setErrorMessage('')
    } catch (err) {
      console.error('Error cargando mesas:', err)
      setMesas([])
      // No ocultar el error: permite diagnosticar falta de contexto/sucursal
      if (err.response) {
        if (err.response.status === 403) {
          setErrorMessage(err.response.data?.error || 'No tiene permisos para consultar las mesas.')
        } else {
          setErrorMessage(err.response.data?.error || 'Error al cargar las mesas.')
        }
      } else {
        setErrorMessage('Error de conexión. Intenta nuevamente.')
      }
    }
  }

  const loadSucursales = async () => {
    try {
      const response = await api.get('/mesas/sucursales')
      setSucursales(response.data)
    } catch (err) {
      console.error('Error cargando sucursales:', err)
    }
  }

  const loadEnlacePublico = async () => {
    try {
      const response = await api.get('/mesas/enlace-publico')
      setEnlacePublico({
        restaurante: response.data.restaurante,
        slug: response.data.slug,
        url: `${window.location.origin}/menu/${response.data.slug}`
      })
    } catch (err) {
      // El enlace público es informativo: no bloquea la vista de mesas
      console.error('Error cargando enlace público:', err)
    }
  }

  const copiarEnlace = async () => {
    if (!enlacePublico) return
    try {
      await navigator.clipboard.writeText(enlacePublico.url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.error('Error copiando enlace:', err)
    }
  }

  useEffect(() => {
    if (!mesaSeleccionada) return
    const actualizada = mesas.find(mesa => mesa.id === mesaSeleccionada.id)
    if (actualizada) {
      if (actualizada !== mesaSeleccionada) setMesaSeleccionada(actualizada)
    } else if (!loading) {
      setMesaSeleccionada(null)
    }
  }, [mesas, loading, mesaSeleccionada])

  const handleLogout = async () => {
    try {
      await api.get('/logout')
    } catch (err) {
      console.error('Error en logout:', err)
    }
    navigate('/login')
  }

  const openCreateModal = () => {
    setFormData({ nombre: '', sucursalId: '' })
    setErrorMessage('')
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setFormData({ nombre: '', sucursalId: '' })
    setErrorMessage('')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!formData.nombre.trim()) {
      setErrorMessage('El nombre de la mesa es obligatorio')
      return
    }

    if (esSuperadmin && !formData.sucursalId) {
      setErrorMessage('Debe seleccionar una sucursal')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', formData.nombre.trim())
    if (esSuperadmin && formData.sucursalId) {
      params.append('sucursalId', formData.sucursalId)
    }

    try {
      await api.post('/mesas', params)
      setSuccessMessage('Mesa creada correctamente')
      closeCreateModal()
      await loadMesas()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      if (err.response) {
        setErrorMessage(err.response.data?.error || 'Error al crear la mesa')
      } else {
        setErrorMessage('Error de conexión. Intenta nuevamente.')
      }
    }
  }

  const handleToggleEstado = async (mesa) => {
    const params = new URLSearchParams()
    params.append('activa', !mesa.activa)

    try {
      await api.post(`/mesas/${mesa.id}/estado`, params)
      setSuccessMessage(mesa.activa ? 'Mesa desactivada correctamente' : 'Mesa activada correctamente')
      await loadMesas()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      if (err.response) {
        setErrorMessage(err.response.data?.error || 'Error al cambiar el estado de la mesa')
      } else {
        setErrorMessage('Error de conexión. Intenta nuevamente.')
      }
      setTimeout(() => setErrorMessage(''), 4000)
    }
  }

  // Abre el detalle de la mesa (también para mesas inactivas, en modo consulta).
  const seleccionarMesa = (mesa) => {
    if (!mesa) return
    setMesaSeleccionada(mesa)
    setErrorMessage('')
  }

  const ordenesPorMesa = useMemo(() => {
    const conteoOrdenes = {}
    pedidos.forEach(pedido => {
      if (!pedido.mesaId) return
      conteoOrdenes[pedido.mesaId] = (conteoOrdenes[pedido.mesaId] || 0) + 1
    })
    return conteoOrdenes
  }, [pedidos])

  const pedidosMesa = useMemo(() => {
    if (!mesaSeleccionada) return []
    return pedidos.filter(pedido => pedido.mesaId === mesaSeleccionada.id)
  }, [pedidos, mesaSeleccionada])

  const pagosPorMesa = useMemo(() => {
    const agrupados = new Map()
    pedidos.forEach(pedido => {
      if (!pedido.mesaId) return
      const lista = agrupados.get(pedido.mesaId) || []
      lista.push(pedido)
      agrupados.set(pedido.mesaId, lista)
    })
    const resumen = {}
    agrupados.forEach((lista, mesaId) => {
      resumen[mesaId] = resumirPagosMesa(lista)
    })
    return resumen
  }, [pedidos])

  const pagoMesaSeleccionada = mesaSeleccionada ? pagosPorMesa[mesaSeleccionada.id] : null

  const cambiarEstadoPedido = async (pedido, estado) => {
    if (pedidoActualizando) return
    setPedidoActualizando(pedido.id)
    setErrorMessage('')
    try {
      await actualizarEstadoPedido(pedido.id, estado)
      const referencia = pedido.numeroSeguimiento || 'Pedido'
      setSuccessMessage(`${referencia} actualizado a ${etiquetaEstado(estado).toLowerCase()}.`)
      await recargarPedidos()
      setTimeout(() => setSuccessMessage(''), 3500)
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'No fue posible actualizar el estado del pedido.')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setPedidoActualizando(null)
    }
  }

  const pedidoManualCreado = async (pedido) => {
    setModalPedidoManual(false)
    setSuccessMessage(
      pedido?.numeroSeguimiento
        ? `Pedido ${pedido.numeroSeguimiento} registrado correctamente.`
        : 'Pedido registrado correctamente.'
    )
    await recargarPedidos()
    setTimeout(() => setSuccessMessage(''), 4000)
  }

  const getSucursalNombre = (sucursalId) => {
    const s = sucursales.find(x => x.id === sucursalId)
    return s ? s.nombre : '—'
  }

  /**
   * Mesas filtradas por los controles visuales (estado + búsqueda).
   * Solo filtra en memoria: ninguna llamada nueva ni datos inventados.
   */
  const mesasFiltradas = useMemo(() => {
    const texto = textoBusqueda.trim().toLowerCase()
    return [...mesas].sort(compararMesas).filter(mesa => {
      if (filtroEstado === 'activas' && !mesa.activa) return false
      if (filtroEstado === 'inactivas' && mesa.activa) return false
      if (texto) {
        const sucursal = getSucursalNombre(mesa.sucursalId).toLowerCase()
        if (!mesa.nombre.toLowerCase().includes(texto)
          && !mesa.codigo.toLowerCase().includes(texto)
          && !sucursal.includes(texto)) {
          return false
        }
      }
      return true
    })
    // getSucursalNombre depende de sucursales; se incluye por claridad
  }, [mesas, filtroEstado, textoBusqueda, sucursales])

  const conteo = (estado) => {
    if (estado === 'activas') return mesas.filter(m => m.activa).length
    if (estado === 'inactivas') return mesas.filter(m => !m.activa).length
    return mesas.length
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  if (!currentUser) return null

  const qrUrl = qrMesa
    ? `${window.location.origin}/menu?mesa=${encodeURIComponent(qrMesa.codigo)}`
    : ''
  const mesasActivas = conteo('activas')
  const mesasOcupadas = mesas.filter(mesa => mesa.estado === 'OCUPADA').length

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      {/* Sidebar compartido */}
      <Sidebar currentUser={currentUser} rutaActual="/mesas" onLogout={handleLogout} />

      {/* Main Content */}
      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
              {esAdmin ? 'Gestión de Mesas' : 'Mesas'}
            </h2>
            <small style={{ color: colores.textoSuave }}>
              {mesas.length === 0
                ? (esMesero ? 'Sin mesas activas asignadas' : 'Sin mesas registradas')
                : esMesero
                  ? `${mesas.length} mesas activas disponibles para atender`
                  : `${mesasActivas} de ${mesas.length} mesas activas · ${mesasOcupadas} ocupadas`}
            </small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {esAdmin && (
              <>
                <button className="btn" style={{ ...btnPrimario, minHeight: '44px' }} onClick={openCreateModal}>
                  <FiPlus style={{ marginRight: '5px' }} /> Nueva Mesa
                </button>
                <button
                  className="btn"
                  style={{ ...btnGhost, minHeight: '44px' }}
                  onClick={() => navigate('/sucursales')}
                  title="Ir a la gestión de sucursales"
                  disabled={!esSuperadmin}
                >
                  <FiLink2 style={{ marginRight: '5px' }} /> Sucursales
                </button>
              </>
            )}
            <span className="text-muted">Hola, <strong>{currentUser.nombre}</strong></span>
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=11362E&color=fff`}
              className="rounded-circle" width="40" height="40" alt="Avatar"
            />
          </div>
        </div>

        {/* Enlace público del menú (RF002) — tarjeta protagonista */}
        {enlacePublico && (
          <div style={{
            ...tarjeta,
            background: `linear-gradient(135deg, ${colores.primario} 0%, ${colores.secundario} 100%)`,
            color: 'white',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1 1 320px' }}>
              <h5 style={{ margin: '0 0 6px 0', fontWeight: 700 }}>
                Portal &amp; Enlace Público del Menú
              </h5>
              <p style={{ margin: 0, opacity: 0.85, fontSize: '14px', maxWidth: '420px' }}>
                Los comensales pueden escanear el QR de su mesa o ingresar por este
                enlace para ver la carta de cada sucursal y ordenar sin fricción.
              </p>
            </div>
            <div style={{ flex: '1 1 340px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <input
                type="text"
                readOnly
                value={enlacePublico.url}
                onFocus={(e) => e.target.select()}
                style={{
                  flex: '1 1 220px',
                  height: '48px',
                  borderRadius: radios.sm,
                  border: 'none',
                  padding: '0 12px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(255,255,255,0.95)'
                }}
              />
              <button
                className="btn"
                style={{
                  minHeight: '48px', borderRadius: radios.sm, fontWeight: 600,
                  backgroundColor: copiado ? colores.exito : 'rgba(255,255,255,0.15)',
                  color: 'white', border: '1px solid rgba(255,255,255,0.3)'
                }}
                onClick={copiarEnlace}
              >
                <FiCopy style={{ marginRight: '6px' }} /> {copiado ? 'Copiado' : 'Copiar enlace'}
              </button>
              <a
                className="btn"
                style={{
                  minHeight: '48px', borderRadius: radios.sm, fontWeight: 600,
                  backgroundColor: 'white', color: colores.primario, border: 'none'
                }}
                href={enlacePublico.url}
                target="_blank"
                rel="noreferrer"
              >
                <FiExternalLink style={{ marginRight: '6px' }} /> Vista previa
              </a>
            </div>
          </div>
        )}

        {/* Mensajes de éxito / error */}
        {successMessage && (
          <div role="alert" style={{
            ...estiloBadge(colores.exitoFondo, colores.exitoTexto),
            ...tarjeta,
            height: 'auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            textTransform: 'none',
            marginBottom: '16px'
          }}>
            <FiCheckCircle size={18} style={{ color: colores.exito, flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div role="alert" style={{
            ...tarjeta,
            backgroundColor: colores.errorFondo,
            border: `1px solid ${colores.errorFondo}`,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            color: colores.errorTexto,
            marginBottom: '16px'
          }}>
            <FiXCircle size={18} style={{ color: colores.error, flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Controles: filtros de estado + búsqueda (referencia Stitch) */}
        <div style={{
          ...tarjeta,
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { clave: 'todas', etiqueta: `Todas (${conteo('todas')})` },
              { clave: 'activas', etiqueta: `Activas (${conteo('activas')})` },
              { clave: 'inactivas', etiqueta: `Inactivas (${conteo('inactivas')})` }
            ].map(chip => {
              const activo = filtroEstado === chip.clave
              return (
                <button
                  key={chip.clave}
                  type="button"
                  onClick={() => setFiltroEstado(chip.clave)}
                  style={{
                    minHeight: '40px',
                    padding: '0 14px',
                    borderRadius: radios.full,
                    border: activo ? `1px solid ${colores.primario}` : `1px solid ${colores.borde}`,
                    backgroundColor: activo ? colores.primario : colores.tarjeta,
                    color: activo ? 'white' : colores.texto,
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {chip.etiqueta}
                </button>
              )
            })}
          </div>
          <div className="ms-md-auto" style={{ position: 'relative', flex: '1 1 240px', maxWidth: '320px' }}>
            <FiSearch style={{
              position: 'absolute', left: '12px', top: '14px', color: colores.textoSuaveClaro
            }} />
            <input
              type="text"
              placeholder="Buscar mesa o sucursal..."
              value={textoBusqueda}
              onChange={(e) => setTextoBusqueda(e.target.value)}
              style={{ ...input, width: '100%', paddingLeft: '36px' }}
              aria-label="Buscar mesa o sucursal"
            />
          </div>
        </div>

        {/* Cuadrícula de mesas: un cuadro por mesa; al hacer clic se abre el detalle */}
        {mesas.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiGrid className="mb-2" style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 600, color: colores.texto }}>
              {esMesero ? 'Sin mesas activas disponibles' : 'No hay mesas registradas'}
            </div>
            <small>
              {esMesero
                ? 'No hay mesas activas en tu sucursal en este momento.'
                : 'Crea tu primera mesa con el botón "Nueva Mesa".'}
            </small>
          </div>
        ) : mesasFiltradas.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiSearch className="mb-2" style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 600, color: colores.texto }}>Sin resultados</div>
            <small>Ninguna mesa coincide con el filtro actual.</small>
          </div>
        ) : (
          <>
            {/* Leyenda de colores */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '13px', color: colores.textoSuave }}>
              {[
                { etiqueta: 'Libre', color: colores.exito },
                { etiqueta: 'Ocupada', color: colores.advertencia },
                { etiqueta: 'Inactiva', color: colores.textoSuaveClaro }
              ].map(item => (
                <span key={item.etiqueta} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: item.color }} />
                  {item.etiqueta}
                </span>
              ))}
              <span style={{ marginLeft: 'auto' }}>Haz clic en una mesa para ver toda su información</span>
            </div>

            <div className="mesas-grid">
              {mesasFiltradas.map(mesa => {
                const visual = estiloMesa(mesa)
                const ordenes = ordenesPorMesa[mesa.id] || 0
                return (
                  <button
                    key={mesa.id}
                    type="button"
                    className="mesa-cuadro"
                    onClick={() => seleccionarMesa(mesa)}
                    aria-label={`${nombreMesa(mesa)}: ${visual.etiqueta}${ordenes ? `, ${ordenes} órdenes activas` : ''}. Ver información`}
                    style={{
                      aspectRatio: '1 / 1',
                      width: '100%',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: radios.lg,
                      border: `2px ${mesa.activa ? 'solid' : 'dashed'} ${visual.borde}`,
                      backgroundColor: visual.fondo,
                      color: visual.texto,
                      boxShadow: sombras.nivel1,
                      cursor: 'pointer',
                      opacity: mesa.activa ? 1 : 0.75
                    }}
                  >
                    {ordenes > 0 && (
                      <span style={{
                        position: 'absolute', top: '10px', right: '10px',
                        minWidth: '24px', height: '24px', padding: '0 7px',
                        borderRadius: radios.full,
                        backgroundColor: colores.primario, color: 'white',
                        fontSize: '12px', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                      }} title={`${ordenes} órdenes activas`}>
                        {ordenes}
                      </span>
                    )}
                    {!mesa.activa && (
                      <FiLock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: colores.textoSuave }} />
                    )}
                    <span style={{
                      fontWeight: 800, fontSize: 'clamp(16px, 2.2vw, 22px)', lineHeight: 1.15,
                      textAlign: 'center', wordBreak: 'break-word', color: colores.texto
                    }}>
                      {nombreMesa(mesa)}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: visual.borde }} />
                      {visual.etiqueta}
                    </span>
                    {esAdmin && sucursales.length > 1 && (
                      <small style={{ color: colores.textoSuave, fontSize: '11px', textAlign: 'center' }}>
                        {getSucursalNombre(mesa.sucursalId)}
                      </small>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal detalle de mesa: toda la información al hacer clic en un cuadro */}
      {mesaSeleccionada && (() => {
        const visual = estiloMesa(mesaSeleccionada)
        const filas = [
          { etiqueta: 'Estado de la mesa', valor: (
            <span style={estiloBadge(visual.fondo, visual.texto)}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: visual.borde }} />
              {visual.etiqueta}
            </span>
          ) },
          { etiqueta: 'Servicio', valor: mesaSeleccionada.activa
            ? <span style={{ color: colores.exitoTexto, fontWeight: 600 }}>Activa</span>
            : <span style={{ color: colores.advertenciaTexto, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiLock size={13} /> Fuera de servicio</span> },
          ...(esAdmin ? [{ etiqueta: 'Sucursal', valor: getSucursalNombre(mesaSeleccionada.sucursalId) }] : []),
          { etiqueta: 'Identificador', valor: <code style={{ color: colores.texto, fontWeight: 600, fontSize: '12px' }}>{mesaSeleccionada.codigo}</code> },
          { etiqueta: 'Pedidos QR', valor: mesaSeleccionada.activa
            ? <span style={{ color: colores.exitoTexto, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={13} /> Habilitado</span>
            : <span style={{ color: colores.textoSuave, fontWeight: 600 }}>Deshabilitado</span> },
          { etiqueta: 'Órdenes activas', valor: <strong>{pedidosMesa.length}</strong> },
          ...(pagoMesaSeleccionada?.cantidad > 0 ? [
            { etiqueta: 'Total activo', valor: <strong className="tnum">{formatearDinero(pagoMesaSeleccionada.total)}</strong> },
            { etiqueta: 'Estado de pago', valor: <EstadoPagoBadge estado={pagoMesaSeleccionada.estado} /> }
          ] : [])
        ]
        return (
          <>
            <div onClick={() => setMesaSeleccionada(null)} style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040
            }} />
            <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-mesa-title">
              <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '880px' }}>
                <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 3.5rem)', width: '100%' }}>
                  {/* Encabezado */}
                  <div style={{
                    padding: '20px 24px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: '12px', borderBottom: `1px solid ${colores.borde}`,
                    borderTop: `5px solid ${visual.borde}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{
                        width: '52px', height: '52px', borderRadius: radios.md,
                        backgroundColor: visual.fondo, border: `2px solid ${visual.borde}`,
                        color: colores.texto, fontWeight: 800, fontSize: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {abreviaturaMesa(mesaSeleccionada)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h4 id="modal-mesa-title" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
                          {nombreMesa(mesaSeleccionada)}
                        </h4>
                        <small style={{ color: colores.textoSuave }}>
                          {visual.etiqueta}{esAdmin ? ` · ${getSucursalNombre(mesaSeleccionada.sucursalId)}` : ''}
                        </small>
                      </div>
                    </div>
                    <button type="button" onClick={() => setMesaSeleccionada(null)} style={{
                      border: 'none', background: 'transparent', color: colores.textoSuave,
                      cursor: 'pointer', fontSize: '20px', padding: '4px'
                    }} aria-label="Cerrar detalle de la mesa">
                      <FiX />
                    </button>
                  </div>

                  <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
                    {/* Información */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '10px', marginBottom: '18px'
                    }}>
                      {filas.map(fila => (
                        <div key={fila.etiqueta} style={{
                          backgroundColor: colores.superficie, borderRadius: radios.md,
                          padding: '10px 12px', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', gap: '8px', fontSize: '13px'
                        }}>
                          <span style={{ color: colores.textoSuave }}>{fila.etiqueta}</span>
                          <span style={{ color: colores.texto, textAlign: 'right' }}>{fila.valor}</span>
                        </div>
                      ))}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      <button
                        type="button" className="btn"
                        onClick={() => setModalPedidoManual(true)}
                        disabled={!mesaSeleccionada.activa}
                        style={{ ...btnPrimario, minHeight: '42px' }}
                      >
                        <FiClipboard style={{ marginRight: '5px' }} /> Registrar pedido manual
                      </button>
                      {esAdmin && (
                        <button
                          type="button" className="btn"
                          onClick={() => setQrMesa(mesaSeleccionada)}
                          disabled={!mesaSeleccionada.activa}
                          style={{ ...btnGhost, minHeight: '42px' }}
                        >
                          <FiGrid style={{ marginRight: '5px' }} /> Ver QR
                        </button>
                      )}
                      {esAdmin && (
                        <button
                          type="button" className="btn"
                          onClick={() => handleToggleEstado(mesaSeleccionada)}
                          style={{
                            ...btnGhost, minHeight: '42px',
                            color: mesaSeleccionada.activa ? colores.errorTexto : colores.exitoTexto
                          }}
                        >
                          {mesaSeleccionada.activa
                            ? <><FiXCircle style={{ marginRight: '5px' }} /> Desactivar mesa</>
                            : <><FiCheckCircle style={{ marginRight: '5px' }} /> Activar mesa</>}
                        </button>
                      )}
                      <button
                        type="button" className="btn"
                        onClick={recargarPedidos}
                        disabled={cargandoPedidos}
                        style={{ ...btnGhost, minHeight: '42px', marginLeft: 'auto' }}
                      >
                        <FiRefreshCw style={{ marginRight: '5px' }} /> Actualizar
                      </button>
                    </div>

                    {/* Órdenes activas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <strong style={{ color: colores.texto, fontSize: '15px' }}>Órdenes activas</strong>
                      <span style={estiloBadge(colores.superficie, colores.textoSuave)}>{pedidosMesa.length}</span>
                      <span style={{ ...estiloBadge(
                        enTiempoReal ? colores.exitoFondo : colores.superficie,
                        enTiempoReal ? colores.exitoTexto : colores.textoSuave
                      ), marginLeft: 'auto' }}>
                        <FiActivity size={12} /> {enTiempoReal ? 'En vivo' : 'Cada 15 s'}
                      </span>
                    </div>

                    {errorPedidos && (
                      <div role="alert" style={{
                        backgroundColor: colores.errorFondo, color: colores.errorTexto,
                        borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px',
                        marginBottom: '10px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: '10px', flexWrap: 'wrap'
                      }}>
                        <span>{errorPedidos}</span>
                        <button type="button" className="btn" onClick={recargarPedidos} style={{ ...btnGhost, minHeight: '34px' }}>
                          Reintentar
                        </button>
                      </div>
                    )}

                    {cargandoPedidos && pedidosMesa.length === 0 ? (
                      <div role="status" style={{ textAlign: 'center', padding: '24px 0', color: colores.textoSuave, fontSize: '13px' }}>
                        <div className="spinner-border spinner-border-sm" style={{ color: colores.primario }}></div>
                        <div style={{ marginTop: '8px' }}>Cargando órdenes de la mesa…</div>
                      </div>
                    ) : pedidosMesa.length === 0 ? (
                      <div style={{
                        backgroundColor: colores.superficie, borderRadius: radios.md,
                        padding: '18px', textAlign: 'center', color: colores.textoSuave, fontSize: '13px'
                      }}>
                        Esta mesa no tiene órdenes activas.
                      </div>
                    ) : (
                      <div className="row g-3">
                        {pedidosMesa.map(pedido => (
                          <div key={pedido.id} className="col-12 col-lg-6">
                            <TarjetaPedido
                              pedido={pedido}
                              nombreMesa={mesaSeleccionada.nombre}
                              onCambiarEstado={cambiarEstadoPedido}
                              actualizando={pedidoActualizando === pedido.id}
                              permitirAcciones={esAdmin || esMesero}
                              compacto
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* Modal Crear Mesa */}
      {showCreateModal && (
        <>
          <div onClick={closeCreateModal} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-create-table-title">
            <div className="modal-dialog modal-dialog-centered modal-sm" style={{ maxWidth: '420px' }}>
              <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: radios.md,
                      backgroundColor: colores.primario, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FiPlus size={18} />
                    </div>
                    <h5 id="modal-create-table-title" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Crear Mesa</h5>
                  </div>
                  <button type="button" onClick={closeCreateModal} style={{
                    border: 'none', background: 'transparent', color: colores.textoSuave,
                    cursor: 'pointer', fontSize: '18px', padding: '4px'
                  }} aria-label="Cerrar">
                    <FiX />
                  </button>
                </div>
                <form onSubmit={handleCreate}>
                  <div style={{ padding: '20px 24px' }}>
                    {errorMessage && (
                      <div style={{
                        backgroundColor: colores.errorFondo, color: colores.errorTexto,
                        borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px', marginBottom: '14px'
                      }}>
                        {errorMessage}
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nombre de la mesa</label>
                      <input
                        type="text" placeholder="Ej: Mesa 1" required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        style={{ ...input, width: '100%' }}
                      />
                    </div>
                    {esSuperadmin && (
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Sucursal</label>
                        <select
                          required value={formData.sucursalId}
                          onChange={(e) => setFormData({ ...formData, sucursalId: e.target.value })}
                          style={{ ...input, width: '100%' }}
                        >
                          <option value="">Seleccionar sucursal</option>
                          {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{
                    borderTop: `1px solid ${colores.borde}`,
                    backgroundColor: colores.superficie,
                    padding: '14px 24px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                  }}>
                    <button type="button" className="btn" onClick={closeCreateModal} style={{
                      ...btnGhost, minHeight: '44px', padding: '0 16px'
                    }}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button type="submit" className="btn" style={{ ...btnPrimario, minHeight: '44px', padding: '0 16px' }}>
                      <FiPlus style={{ marginRight: '5px' }} /> Crear
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal QR */}
      {qrMesa && (
        <>
          <div onClick={() => setQrMesa(null)} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-qr-title">
            <div className="modal-dialog modal-dialog-centered modal-sm" style={{ maxWidth: '420px' }}>
              <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: radios.md,
                      backgroundColor: colores.primario, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FiGrid size={18} />
                    </div>
                    <h5 id="modal-qr-title" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>QR — {qrMesa.nombre}</h5>
                  </div>
                  <button type="button" onClick={() => setQrMesa(null)} style={{
                    border: 'none', background: 'transparent', color: colores.textoSuave,
                    cursor: 'pointer', fontSize: '18px', padding: '4px'
                  }} aria-label="Cerrar">
                    <FiX />
                  </button>
                </div>
                <div style={{ padding: '0 24px 20px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', padding: '16px', backgroundColor: 'white', borderRadius: radios.md, border: `1px solid ${colores.borde}` }}>
                    <QRCodeSVG value={qrUrl} size={200} />
                  </div>
                  <p className="mt-3 mb-1" style={{ fontWeight: 700, color: colores.texto }}>{qrMesa.nombre}</p>
                  <code style={{ fontSize: '12px', color: colores.textoSuave }}>{qrMesa.codigo}</code>
                  <div className="mt-2">
                    <small style={{ color: colores.textoSuave, display: 'block', wordBreak: 'break-all' }}>{qrUrl}</small>
                  </div>
                </div>
                <div style={{
                  borderTop: `1px solid ${colores.borde}`,
                  backgroundColor: colores.superficie,
                  padding: '14px 24px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px'
                }}>
                  <button type="button" className="btn" onClick={() => setQrMesa(null)} style={{
                    ...btnGhost, minHeight: '44px', padding: '0 16px'
                  }}>
                    Cerrar
                  </button>
                  <a
                    className="btn"
                    style={{ ...btnPrimario, minHeight: '44px', padding: '0 16px', display: 'inline-flex', alignItems: 'center' }}
                    href={qrUrl} target="_blank" rel="noopener noreferrer"
                    aria-label={`Abrir menú de ${qrMesa.nombre} en una pestaña nueva`}
                  >
                    Abrir enlace
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {modalPedidoManual && mesaSeleccionada && (
        <ModalPedidoManual
          mesa={mesaSeleccionada}
          onCerrar={() => setModalPedidoManual(false)}
          onCreado={pedidoManualCreado}
        />
      )}
    </div>
  )
}

export default Mesas
