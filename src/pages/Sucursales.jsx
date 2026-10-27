import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiX, FiEdit2, FiTrash2, FiCheckCircle, FiXCircle, FiHome, FiMapPin, FiPhone } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { obtenerMensajeError, MENSAJES } from '../services/mensajes.js'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, estiloBadge, input } from '../styles/tokens.js'

function Sucursales() {
  const [currentUser, setCurrentUser] = useState(null)
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('crear')
  const [selectedSucursal, setSelectedSucursal] = useState(null)
  const [formData, setFormData] = useState({ nombre: '', direccion: '', telefono: '' })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [sucursalAEliminar, setSucursalAEliminar] = useState(null)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!showModal && !showDeleteModal) return

    const manejarEscape = (evento) => {
      if (evento.key !== 'Escape') return
      evento.preventDefault()
      if (showDeleteModal && !deleting) {
        setShowDeleteModal(false)
        setSucursalAEliminar(null)
      } else if (showModal && !saving) {
        closeModal()
      }
    }

    window.addEventListener('keydown', manejarEscape)
    return () => window.removeEventListener('keydown', manejarEscape)
  }, [showModal, showDeleteModal, deleting, saving])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setCurrentUser(response.data)
      if (response.data.rol !== 'SUPERADMIN') {
        navigate('/dashboard')
      } else {
        await loadSucursales()
      }
    } catch (err) {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadSucursales = async () => {
    try {
      const response = await api.get('/sucursales')
      setSucursales(response.data)
    } catch (err) {
      console.error('Error cargando sucursales:', err)
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
    setFormData({ nombre: '', direccion: '', telefono: '' })
    setModalMode('crear')
    setErrorMessage('')
    setShowModal(true)
  }

  const openEditModal = (sucursal) => {
    setSelectedSucursal(sucursal)
    setFormData({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || '',
      telefono: sucursal.telefono || ''
    })
    setModalMode('editar')
    setErrorMessage('')
    setShowModal(true)
  }

  const closeModal = (forzar = false) => {
    if (saving && !forzar) return
    setShowModal(false)
    setSelectedSucursal(null)
    setErrorMessage('')
    setSaving(false)
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setShowDeleteModal(false)
    setSucursalAEliminar(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!formData.nombre.trim()) {
      setErrorMessage('El nombre de la sucursal es obligatorio')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', formData.nombre.trim())
    params.append('direccion', formData.direccion || '')
    params.append('telefono', formData.telefono || '')

    setSaving(true)

    try {
      if (modalMode === 'crear') {
        await api.post('/sucursales', params)
        setSuccessMessage(MENSAJES.SUCURSAL_CREADA)
      } else {
        await api.put(`/sucursales/${selectedSucursal.id}`, params)
        setSuccessMessage(MENSAJES.SUCURSAL_ACTUALIZADA)
      }

      setSaving(false)
      closeModal(true)
      await loadSucursales()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setSaving(false)
      setErrorMessage(obtenerMensajeError(err, 'No fue posible guardar la sucursal.'))
    }
  }

  const handleToggleEstado = async (sucursal) => {
    const params = new URLSearchParams()
    params.append('activa', !sucursal.activa)

    try {
      await api.post(`/sucursales/${sucursal.id}/estado`, params)
      setSuccessMessage(sucursal.activa ? MENSAJES.SUCURSAL_DESACTIVADA : MENSAJES.SUCURSAL_ACTIVADA)
      await loadSucursales()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(obtenerMensajeError(err, 'No fue posible cambiar el estado de la sucursal.'))
      setTimeout(() => setErrorMessage(''), 4000)
    }
  }

  const confirmDelete = async () => {
    if (!sucursalAEliminar) return

    setDeleting(true)
    try {
      await api.delete(`/sucursales/${sucursalAEliminar.id}`)
      setSuccessMessage(MENSAJES.SUCURSAL_ELIMINADA)
      setShowDeleteModal(false)
      setSucursalAEliminar(null)
      await loadSucursales()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setShowDeleteModal(false)
      setSucursalAEliminar(null)
      setErrorMessage(obtenerMensajeError(err, 'No fue posible eliminar la sucursal.'))
      setTimeout(() => setErrorMessage(''), 6000)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  if (!currentUser) return null

  const activas = sucursales.filter(s => s.activa).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/sucursales" onLogout={handleLogout} />

      <div style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Sucursales</h2>
            <small style={{ color: colores.textoSuave }}>
              {sucursales.length > 0
                ? `${activas} de ${sucursales.length} sucursales activas`
                : 'Sin sucursales registradas'}
            </small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn" style={{ ...btnPrimario, minHeight: '44px' }} onClick={openCreateModal}>
              <FiPlus style={{ marginRight: '5px' }} /> Crear Sucursal
            </button>
            <span className="text-muted">Hola, <strong>{currentUser.nombre}</strong></span>
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=11362E&color=fff`}
              className="rounded-circle" width="40" height="40" alt="Avatar"
            />
          </div>
        </div>

        {/* Mensajes */}
        {successMessage && (
          <div style={{
            ...tarjeta,
            backgroundColor: colores.exitoFondo,
            border: `1px solid ${colores.exitoFondo}`,
            color: colores.exitoTexto,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            <FiCheckCircle size={18} style={{ color: colores.exito, flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{
            ...tarjeta,
            backgroundColor: colores.errorFondo,
            border: `1px solid ${colores.errorFondo}`,
            color: colores.errorTexto,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            <FiXCircle size={18} style={{ color: colores.error, flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cuadrícula de tarjetas de sucursal */}
        {sucursales.length === 0 ? (
          <div style={{ ...tarjeta, padding: '56px 24px', textAlign: 'center', color: colores.textoSuave }}>
            <FiHome className="mb-2" style={{ fontSize: '2rem', color: colores.textoSuaveClaro }} />
            <div style={{ fontWeight: 600, color: colores.texto }}>No hay sucursales registradas</div>
            <small>Crea la primera sucursal de tu restaurante.</small>
          </div>
        ) : (
          <div className="row g-3">
            {sucursales.map(s => (
              <div key={s.id} className="col-12 col-md-6 col-xl-4">
                <div style={{ ...tarjeta, padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      borderRadius: radios.md,
                      backgroundColor: colores.mint,
                      color: colores.primario,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FiHome size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: colores.texto, fontSize: '15px' }}>{s.nombre}</div>
                      {s.activa ? (
                        <span className="mt-1" style={estiloBadge(colores.exitoFondo, colores.exitoTexto)}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colores.exito }} />
                          Activa
                        </span>
                      ) : (
                        <span className="mt-1" style={estiloBadge(colores.errorFondo, colores.errorTexto)}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colores.error }} />
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiMapPin size={14} style={{ color: colores.textoSuaveClaro, flexShrink: 0 }} />
                      <span style={{ color: colores.textoSuave }}>{s.direccion || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiPhone size={14} style={{ color: colores.textoSuaveClaro, flexShrink: 0 }} />
                      <span style={{ color: colores.textoSuave }}>{s.telefono || '—'}</span>
                    </div>
                  </div>

                  <div className="row g-2 mt-3">
                    <div className="col-4">
                      <button
                        className="btn w-100"
                        title="Editar sucursal"
                        onClick={() => openEditModal(s)}
                        style={{ ...btnGhost, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <FiEdit2 />
                      </button>
                    </div>
                    <div className="col-4">
                      <button
                        className="btn w-100"
                        title={s.activa ? 'Desactivar' : 'Activar'}
                        onClick={() => handleToggleEstado(s)}
                        style={{
                          ...btnGhost,
                          minHeight: '44px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: s.activa ? colores.advertenciaTexto : colores.exitoTexto
                        }}
                      >
                        {s.activa ? <FiXCircle /> : <FiCheckCircle />}
                      </button>
                    </div>
                    <div className="col-4">
                      <button
                        className="btn w-100"
                        title="Eliminar sucursal"
                        onClick={() => setSucursalAEliminar(s)}
                        style={{
                          ...btnGhost,
                          minHeight: '44px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: colores.error
                        }}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <>
          <div onClick={() => closeModal()} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-sm" style={{ maxWidth: '440px' }}>
              <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: radios.md,
                      backgroundColor: colores.primario, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {modalMode === 'crear' ? <FiPlus size={18} /> : <FiEdit2 size={18} />}
                    </div>
                    <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
                      {modalMode === 'crear' ? 'Crear Sucursal' : 'Editar Sucursal'}
                    </h5>
                  </div>
                  <button type="button" onClick={() => closeModal()} disabled={saving} style={{
                    border: 'none', background: 'transparent', color: colores.textoSuave,
                    cursor: 'pointer', fontSize: '18px', padding: '4px'
                  }} aria-label="Cerrar">
                    <FiX />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
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
                      <label className="form-label small fw-semibold">Nombre</label>
                      <input
                        type="text" placeholder="Ej: Sucursal Norte" required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        style={{ ...input, width: '100%' }}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Dirección</label>
                      <input
                        type="text" placeholder="Calle 123 #45-67"
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                        style={{ ...input, width: '100%' }}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Teléfono</label>
                      <input
                        type="text" placeholder="3001234567"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        style={{ ...input, width: '100%' }}
                      />
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
                    <button type="button" className="btn" onClick={() => closeModal()} disabled={saving} style={{
                      ...btnGhost, minHeight: '44px', padding: '0 16px'
                    }}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button type="submit" className="btn" style={{ ...btnPrimario, minHeight: '44px', padding: '0 16px' }} disabled={saving}>
                      {saving ? 'Guardando...' : (modalMode === 'crear' ? 'Crear' : 'Guardar cambios')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteModal && sucursalAEliminar && (
        <>
          <div onClick={closeDeleteModal} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-sm" style={{ maxWidth: '440px' }}>
              <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: radios.md,
                    backgroundColor: colores.errorFondo, color: colores.error,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <FiTrash2 size={18} />
                  </div>
                  <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Eliminar Sucursal</h5>
                </div>
                <div style={{ padding: '0 24px 20px 24px' }}>
                  <p className="mb-2">¿Estás seguro de que deseas eliminar esta sucursal?</p>
                  <p style={{ marginBottom: 0, color: colores.texto, fontWeight: 600 }}>{sucursalAEliminar.nombre}</p>
                  <small style={{ color: colores.textoSuave, display: 'block', marginTop: '8px' }}>
                    Los productos del catálogo global NO se eliminarán. Solo se quitará la relación con esta sucursal.
                  </small>
                </div>
                <div style={{
                  borderTop: `1px solid ${colores.borde}`,
                  backgroundColor: colores.superficie,
                  padding: '14px 24px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px'
                }}>
                  <button type="button" className="btn" onClick={closeDeleteModal} disabled={deleting} style={{
                    ...btnGhost, minHeight: '44px', padding: '0 16px'
                  }}>
                    <FiX style={{ marginRight: '5px' }} /> Cancelar
                  </button>
                  <button type="button" className="btn" onClick={confirmDelete} disabled={deleting} style={{
                    backgroundColor: colores.error, borderColor: colores.error,
                    color: 'white', fontWeight: 600, borderRadius: radios.sm, minHeight: '44px', padding: '0 16px'
                  }}>
                    {deleting ? 'Eliminando...' : (<><FiTrash2 style={{ marginRight: '5px' }} /> Eliminar</>)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Sucursales
