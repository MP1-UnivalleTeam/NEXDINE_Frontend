import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiX, FiCheckCircle, FiXCircle, FiGrid, FiLink2, FiCopy, FiExternalLink, FiSearch, FiLock } from 'react-icons/fi'
import { QRCodeSVG } from 'qrcode.react'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, estiloBadge, input } from '../styles/tokens.js'

function Mesas() {
  const [currentUser, setCurrentUser] = useState(null)
  const [mesas, setMesas] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const esSuperadmin = currentUser?.rol === 'SUPERADMIN'

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
    if (!showCreateModal && !qrMesa) return

    const manejarEscape = (evento) => {
      if (evento.key !== 'Escape') return
      evento.preventDefault()
      if (qrMesa) {
        setQrMesa(null)
      } else {
        closeCreateModal()
      }
    }

    window.addEventListener('keydown', manejarEscape)
    return () => window.removeEventListener('keydown', manejarEscape)
  }, [showCreateModal, qrMesa])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setCurrentUser(response.data)
      if (response.data.rol !== 'ADMINISTRADOR' && response.data.rol !== 'SUPERADMIN') {
        navigate('/dashboard')
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
        setErrorMessage('Error de conexión con el servidor.')
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
        setErrorMessage('Error de conexión con el servidor')
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
        setErrorMessage('Error de conexión con el servidor')
      }
      setTimeout(() => setErrorMessage(''), 4000)
    }
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
    return mesas.filter(mesa => {
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      {/* Sidebar compartido */}
      <Sidebar currentUser={currentUser} rutaActual="/mesas" onLogout={handleLogout} />

      {/* Main Content */}
      <div style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Gestión de Mesas</h2>
            <small style={{ color: colores.textoSuave }}>
              {mesas.length > 0 ? `${mesasActivas} de ${mesas.length} mesas activas` : 'Sin mesas registradas'}
            </small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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

        {/* Cuadrícula de tarjetas de mesa */}
        {mesas.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiGrid className="mb-2" style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 600, color: colores.texto }}>No hay mesas registradas</div>
            <small>Crea tu primera mesa con el botón "Nueva Mesa".</small>
          </div>
        ) : mesasFiltradas.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiSearch className="mb-2" style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 600, color: colores.texto }}>Sin resultados</div>
            <small>Ninguna mesa coincide con el filtro actual.</small>
          </div>
        ) : (
          <div className="row g-3">
            {mesasFiltradas.map(mesa => (
              <div key={mesa.id} className="col-12 col-md-6 col-xl-4">
                <div style={{ ...tarjeta, padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Encabezado de tarjeta */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      borderRadius: radios.md,
                      backgroundColor: colores.superficie,
                      color: colores.texto,
                      fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {mesa.nombre.replace(/^\D+/i, '').slice(0, 2).padStart(2, '0') || mesa.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: colores.texto, fontSize: '15px' }}>{mesa.nombre}</div>
                      <small style={{ color: colores.textoSuave }}>
                        {getSucursalNombre(mesa.sucursalId)}
                      </small>
                    </div>
                    {mesa.activa ? (
                      <span style={estiloBadge(colores.exitoFondo, colores.exitoTexto)}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colores.exito }} />
                        Activa
                      </span>
                    ) : (
                      <span style={estiloBadge(colores.errorFondo, colores.errorTexto)}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colores.error }} />
                        Inactiva
                      </span>
                    )}
                  </div>

                  {/* Detalles */}
                  <div style={{
                    backgroundColor: colores.superficie,
                    borderRadius: radios.md,
                    padding: '12px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: colores.textoSuave }}>Identificador</span>
                      <code style={{ color: colores.texto, fontWeight: 600, fontSize: '12px' }}>{mesa.codigo}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: colores.textoSuave }}>Pedidos QR</span>
                      <span style={{ color: colores.exitoTexto, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FiCheckCircle size={13} /> Habilitado
                      </span>
                    </div>
                    {!mesa.activa && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: colores.textoSuave }}>Estado</span>
                        <span style={{
                          color: colores.advertenciaTexto, fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <FiLock size={13} /> Fuera de servicio
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Acciones: el QR permanece disponible bajo demanda */}
                  <div className="row g-2 mt-3">
                    <div className="col-6">
                      <button
                        className="btn w-100"
                        title="Generar QR"
                        disabled={!mesa.activa}
                        onClick={() => setQrMesa(mesa)}
                        style={{
                          ...btnGhost,
                          minHeight: '44px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          opacity: mesa.activa ? 1 : 0.5,
                          cursor: mesa.activa ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <FiGrid /> Ver QR
                      </button>
                    </div>
                    <div className="col-6">
                      <button
                        className="btn w-100"
                        title={mesa.activa ? 'Desactivar mesa' : 'Activar mesa'}
                        onClick={() => handleToggleEstado(mesa)}
                        style={{
                          ...btnPrimario,
                          minHeight: '44px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          backgroundColor: mesa.activa ? colores.tarjeta : colores.primario,
                          color: mesa.activa ? colores.primario : 'white',
                          border: `1px solid ${colores.borde}`
                        }}
                      >
                        {mesa.activa ? <FiXCircle /> : <FiCheckCircle />}
                        {mesa.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  )
}

export default Mesas
