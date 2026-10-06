import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiX, FiEdit2, FiCheckCircle, FiXCircle, FiGrid } from 'react-icons/fi'
import { QRCodeSVG } from 'qrcode.react'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'

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

  useEffect(() => {
    checkAuth()
  }, [])

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

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (!currentUser) return null

  const qrUrl = qrMesa ? `${window.location.origin}/menu?mesa=${qrMesa.codigo}` : ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Sidebar compartido */}
      <Sidebar currentUser={currentUser} rutaActual="/mesas" onLogout={handleLogout} />

      {/* Main Content */}
      <div style={{ marginLeft: '260px', flex: 1, padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2>Mesas</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn" style={{ backgroundColor: '#1a3c34', color: 'white' }} onClick={openCreateModal}>
              <FiPlus style={{ marginRight: '5px' }} /> Crear Mesa
            </button>
            <span className="text-muted">Hola, <strong>{currentUser.nombre}</strong></span>
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=1a3c34&color=fff`}
              className="rounded-circle" width="40" height="40" alt="Avatar"
            />
          </div>
        </div>

        {enlacePublico && (
          <div className="card p-3 mb-4" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <h5 className="mb-2">
              <i className="fa-solid fa-link me-2"></i>Enlace público del menú
            </h5>
            <div className="d-flex align-items-center gap-2">
              <input
                type="text"
                readOnly
                className="form-control form-control-sm"
                value={enlacePublico.url}
                style={{ fontSize: '0.8rem' }}
              />
              <button
                className={`btn btn-sm ${copiado ? 'btn-success' : ''}`}
                style={copiado ? {} : { backgroundColor: '#1a3c34', color: 'white' }}
                onClick={copiarEnlace}
              >
                {copiado ? 'Copiado' : 'Copiar enlace'}
              </button>
              <a
                className="btn btn-sm btn-outline-secondary"
                href={enlacePublico.url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir
              </a>
            </div>
            <small className="text-muted">
              Restaurante: {enlacePublico.restaurante} — compartible en redes sociales y mensajería.
            </small>
          </div>
        )}

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
          {mesas.length === 0 ? (
            <div className="text-center text-muted py-4">
              <FiGrid className="mb-2" style={{ fontSize: '2rem', color: '#ccc' }} />
              <div>No hay mesas registradas</div>
            </div>
          ) : (
            <table className="table table-hover align-middle">
              <thead className="text-muted">
                <tr>
                  <th>Nombre</th>
                  {esSuperadmin && <th>Sucursal</th>}
                  <th>Código QR</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mesas.map(mesa => (
                  <tr key={mesa.id}>
                    <td><strong>{mesa.nombre}</strong></td>
                    {esSuperadmin && <td className="text-muted">{getSucursalNombre(mesa.sucursalId)}</td>}
                    <td><code className="text-muted" style={{ fontSize: '0.75rem' }}>{mesa.codigo}</code></td>
                    <td>
                      {mesa.activa ? (
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
                        <button
                          className="btn btn-sm btn-outline-primary"
                          title="Generar QR"
                          disabled={!mesa.activa}
                          onClick={() => setQrMesa(mesa)}
                        >
                          <FiGrid />
                        </button>
                        <button
                          className={`btn btn-sm ${mesa.activa ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          title={mesa.activa ? 'Desactivar mesa' : 'Activar mesa'}
                          onClick={() => handleToggleEstado(mesa)}
                        >
                          {mesa.activa ? <FiXCircle /> : <FiCheckCircle />}
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

      {/* Modal Crear Mesa */}
      {showCreateModal && (
        <>
          <div onClick={closeCreateModal} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                  <h5 className="modal-title"><FiPlus style={{ marginRight: '8px' }} />Crear Mesa</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={closeCreateModal}></button>
                </div>
                <form onSubmit={handleCreate}>
                  <div className="modal-body">
                    {errorMessage && (
                      <div className="alert alert-danger d-flex align-items-center" role="alert">
                        <i className="fa-solid fa-circle-exclamation me-2"></i>
                        <div>{errorMessage}</div>
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nombre de la mesa</label>
                      <input
                        type="text" className="form-control" placeholder="Ej: Mesa 1" required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      />
                    </div>
                    {esSuperadmin && (
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Sucursal</label>
                        <select
                          className="form-select" required value={formData.sucursalId}
                          onChange={(e) => setFormData({ ...formData, sucursalId: e.target.value })}
                        >
                          <option value="">Seleccionar sucursal</option>
                          {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={closeCreateModal}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button type="submit" className="btn btn-sm" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                  <h5 className="modal-title">
                    <FiGrid style={{ marginRight: '8px' }} />QR — {qrMesa.nombre}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setQrMesa(null)}></button>
                </div>
                <div className="modal-body text-center">
                  <div className="d-inline-block p-3 bg-white rounded shadow">
                    <QRCodeSVG value={qrUrl} size={200} />
                  </div>
                  <p className="mt-3 mb-1"><strong>{qrMesa.nombre}</strong></p>
                  <code className="text-muted" style={{ fontSize: '0.75rem' }}>{qrMesa.codigo}</code>
                  <div className="mt-2">
                    <small className="text-muted d-block" style={{ wordBreak: 'break-all' }}>{qrUrl}</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQrMesa(null)}>
                    Cerrar
                  </button>
                  <a
                    className="btn btn-sm"
                    style={{ backgroundColor: '#1a3c34', color: 'white' }}
                    href={qrUrl} target="_blank" rel="noreferrer"
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