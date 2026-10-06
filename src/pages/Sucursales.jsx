import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiX, FiEdit2, FiTrash2, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { obtenerMensajeError, MENSAJES } from '../services/mensajes.js'

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

  const closeModal = () => {
    setShowModal(false)
    setSelectedSucursal(null)
    setErrorMessage('')
    setSaving(false)
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

      closeModal()
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
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (!currentUser) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      <Sidebar currentUser={currentUser} rutaActual="/sucursales" onLogout={handleLogout} />

      <div style={{ marginLeft: '260px', flex: 1, padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 className="mb-0">Sucursales</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn" style={{ backgroundColor: '#1a3c34', color: 'white' }} onClick={openCreateModal}>
              <FiPlus style={{ marginRight: '5px' }} /> Crear Sucursal
            </button>
            <span className="text-muted">Hola, <strong>{currentUser.nombre}</strong></span>
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=1a3c34&color=fff`}
              className="rounded-circle" width="40" height="40" alt="Avatar"
            />
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-success d-flex align-items-center" role="alert">
            <i className="fa-solid fa-circle-check me-2"></i>
            <div>{successMessage}</div>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <i className="fa-solid fa-circle-exclamation me-2"></i>
            <div>{errorMessage}</div>
          </div>
        )}

        <div className="card p-4" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
          {sucursales.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="fa-solid fa-store fa-2x mb-2 d-block" style={{ color: '#ccc' }}></i>
              No hay sucursales registradas
            </div>
          ) : (
            <table className="table table-hover align-middle">
              <thead className="text-muted">
                <tr>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sucursales.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.nombre}</strong></td>
                    <td className="text-muted">{s.direccion || '—'}</td>
                    <td className="text-muted">{s.telefono || '—'}</td>
                    <td>
                      {s.activa ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          <FiCheckCircle style={{ marginRight: '4px' }} />Activa
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          <FiXCircle style={{ marginRight: '4px' }} />Inactiva
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" title="Editar sucursal" onClick={() => openEditModal(s)}>
                          <FiEdit2 />
                        </button>
                        <button
                          className={`btn btn-sm ${s.activa ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          title={s.activa ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggleEstado(s)}
                        >
                          {s.activa ? <FiXCircle /> : <FiCheckCircle />}
                        </button>
                        <button className="btn btn-sm btn-outline-danger" title="Eliminar sucursal" onClick={() => setSucursalAEliminar(s)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <>
          <div onClick={closeModal} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                  <h5 className="modal-title">
                    {modalMode === 'crear' ? (
                      <><FiPlus style={{ marginRight: '8px' }} />Crear Sucursal</>
                    ) : (
                      <><FiEdit2 style={{ marginRight: '8px' }} />Editar Sucursal</>
                    )}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {errorMessage && (
                      <div className="alert alert-danger d-flex align-items-center py-2" role="alert">
                        <i className="fa-solid fa-circle-exclamation me-2"></i>
                        <div className="small">{errorMessage}</div>
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nombre</label>
                      <input
                        type="text" className="form-control" placeholder="Ej: Sucursal Norte" required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Dirección</label>
                      <input
                        type="text" className="form-control" placeholder="Calle 123 #45-67"
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Teléfono</label>
                      <input
                        type="text" className="form-control" placeholder="3001234567"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={closeModal}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button type="submit" className="btn btn-sm" style={{ backgroundColor: '#1a3c34', color: 'white' }} disabled={saving}>
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
          <div onClick={() => setShowDeleteModal(false)} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                  <h5 className="modal-title">
                    <FiTrash2 style={{ marginRight: '8px' }} />Eliminar Sucursal
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2">¿Estás seguro de que deseas eliminar esta sucursal?</p>
                  <p className="text-muted mb-0"><strong>{sucursalAEliminar.nombre}</strong></p>
                  <small className="text-muted d-block mt-2">
                    Los productos del catálogo global NO se eliminarán. Solo se quitará la relación con esta sucursal.
                  </small>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDeleteModal(false)}>
                    <FiX style={{ marginRight: '5px' }} /> Cancelar
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={confirmDelete} disabled={deleting}>
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