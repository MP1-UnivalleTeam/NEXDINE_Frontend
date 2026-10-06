import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiEdit2, FiX, FiPower } from 'react-icons/fi'
import api from '../services/api.js'
import Toast from '../components/Toast.jsx'

function Productos() {
  const [currentUser, setCurrentUser] = useState(null)
  const [productos, setProductos] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState(null)
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('crear')
  const [selectedProducto, setSelectedProducto] = useState(null)

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    imagen: '',
    sucursalIds: []
  })

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const esAdministrador = currentUser?.rol === 'ADMINISTRADOR'
  const esSuperadmin = currentUser?.rol === 'SUPERADMIN'

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const usuario = response.data

      if (usuario.rol !== 'ADMINISTRADOR' && usuario.rol !== 'SUPERADMIN') {
        navigate('/dashboard')
        return
      }

      setCurrentUser(usuario)
      await loadProductos()

      // Las sucursales solo son necesarias para el SUPERADMIN,
      // que administra el catálogo global y sus asociaciones.
      if (usuario.rol === 'SUPERADMIN') {
        await loadSucursales()
      }
    } catch (err) {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadProductos = async () => {
    try {
      const response = await api.get('/productos')
      setProductos(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'No fue posible cargar los productos')
    }
  }

  const loadSucursales = async () => {
    try {
      const response = await api.get('/productos/sucursales')
      setSucursales(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'No fue posible cargar las sucursales')
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

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      imagen: '',
      sucursalIds: []
    })
    setSelectedProducto(null)
    setErrorMessage('')
  }

  const openCreateModal = () => {
    resetForm()
    setModalMode('crear')
    setShowModal(true)
  }

  const openEditModal = async (producto) => {
    setErrorMessage('')
    setSelectedProducto(producto)
    setModalMode('editar')

    try {
      const response = await api.get(`/productos/${producto.id}/sucursales`)
      setFormData({
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        precio: producto.precio,
        imagen: producto.imagen || '',
        sucursalIds: (response.data || []).map(Number)
      })
      setShowModal(true)
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'No fue posible cargar las sucursales del producto')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const toggleSucursal = (sucursalId) => {
    const id = Number(sucursalId)
    setFormData(prev => ({
      ...prev,
      sucursalIds: prev.sucursalIds.includes(id)
        ? prev.sucursalIds.filter(item => item !== id)
        : [...prev.sucursalIds, id]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!formData.nombre.trim()) {
      setErrorMessage('El nombre del producto es obligatorio')
      return
    }

    const precioNum = Number(formData.precio)
    if (!Number.isFinite(precioNum) || precioNum <= 0) {
      setErrorMessage('El precio debe ser un valor mayor que 0')
      return
    }

    if (formData.sucursalIds.length === 0) {
      setErrorMessage('Debe seleccionar al menos una sucursal')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', formData.nombre.trim())
    params.append('descripcion', formData.descripcion || '')
    params.append('precio', String(precioNum))
    params.append('imagen', formData.imagen || '')
    formData.sucursalIds.forEach(id => params.append('sucursalIds', String(id)))

    try {
      const response = modalMode === 'crear'
        ? await api.post('/productos/create', params)
        : await api.put(`/productos/${selectedProducto.id}`, params)

      setSuccessMessage(
        response.data?.message ||
        (modalMode === 'crear' ? 'Producto agregado exitosamente' : 'Producto actualizado exitosamente')
      )
      closeModal()
      await loadProductos()
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'No fue posible guardar el producto')
    }
  }

  const handleToggleDisponibilidad = async (producto) => {
    if (!esAdministrador || typeof producto.disponibleEnMiSucursal !== 'boolean') {
      return
    }

    const nuevaDisponibilidad = !producto.disponibleEnMiSucursal
    setUpdatingAvailabilityId(producto.id)
    setErrorMessage('')

    const params = new URLSearchParams()
    params.append('disponible', String(nuevaDisponibilidad))

    try {
      const response = await api.put(`/productos/${producto.id}/disponibilidad`, params)
      setSuccessMessage(
        response.data?.message ||
        (nuevaDisponibilidad
          ? 'Producto marcado como disponible correctamente'
          : 'Producto marcado como no disponible correctamente')
      )
      await loadProductos()
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'No fue posible actualizar la disponibilidad del producto')
    } finally {
      setUpdatingAvailabilityId(null)
    }
  }

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (!currentUser) return null

  return (
    <>
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />
      <Toast message={errorMessage} type="error" onClose={() => setErrorMessage('')} />

      <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '260px',
          backgroundColor: '#1a3c34',
          color: 'white',
          position: 'fixed',
          height: '100%',
          paddingTop: '20px'
        }}>
          <div style={{ padding: '0 20px 30px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fa-solid fa-utensils"></i> NEXDINE
            </div>
          </div>

          <ul className="nav flex-column mt-3">
            <li className="nav-item">
              <a href="/dashboard" className="nav-link" style={{
                color: 'rgba(255,255,255,0.8)',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fa-solid fa-users"></i> Usuarios
              </a>
            </li>
            <li className="nav-item">
              <a href="/productos" className="nav-link" style={{
                backgroundColor: '#2c5a4d',
                borderLeft: '4px solid #fff',
                color: 'white',
                fontWeight: 600,
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fa-solid fa-utensils"></i> Productos
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className="nav-link" style={{
                color: 'rgba(255,255,255,0.8)',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fa-solid fa-receipt"></i> Pedidos
              </a>
            </li>
          </ul>

          <div style={{ position: 'absolute', bottom: '20px', width: '100%', padding: '0 20px' }}>
            <a href="/login" onClick={(e) => { e.preventDefault(); handleLogout() }} className="text-white text-decoration-none">
              <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ marginLeft: '260px', flex: 1, padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="mb-1">{esAdministrador ? 'Disponibilidad de productos' : 'Gestión de productos'}</h2>
              <p className="text-muted mb-0">
                {esAdministrador
                  ? 'Modifica la disponibilidad de los productos para tu sucursal.'
                  : 'Administra el catálogo y las sucursales donde está disponible cada producto.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {esSuperadmin && (
                <button className="btn" style={{ backgroundColor: '#1a3c34', color: 'white' }} onClick={openCreateModal}>
                  <FiPlus style={{ marginRight: '5px' }} /> Agregar Producto
                </button>
              )}
              <span className="text-muted">Hola, <strong>{currentUser.nombre}</strong></span>
              <img
                src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=1a3c34&color=fff`}
                className="rounded-circle"
                width="40"
                height="40"
                alt="Avatar"
              />
            </div>
          </div>

          <div className="alert alert-info d-flex align-items-center mb-4">
            <i className="fa-solid fa-circle-info me-2"></i>
            <div>
              {esAdministrador
                ? 'La disponibilidad se actualiza en la sucursal asignada al administrador y se guarda directamente en la base de datos.'
                : 'El SUPERADMIN administra el catálogo global y las asociaciones de productos con las sucursales.'}
            </div>
          </div>

          {/* Tabla */}
          <div className="card p-4" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <table className="table table-hover align-middle">
              <thead className="text-muted">
                <tr>
                  <th>Imagen</th>
                  <th>Producto</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                  <th>{esAdministrador ? 'Disponibilidad' : 'Estado del catálogo'}</th>
                  {esSuperadmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan={esSuperadmin ? 6 : 5} className="text-center text-muted py-4">
                      <i className="fa-solid fa-utensils fa-2x mb-2 d-block" style={{ color: '#ccc' }}></i>
                      No hay productos registrados
                    </td>
                  </tr>
                ) : (
                  productos.map(producto => {
                    const disponibilidad = esAdministrador
                      ? producto.disponibleEnMiSucursal
                      : producto.disponible
                    const puedeCambiarDisponibilidad = esAdministrador && typeof disponibilidad === 'boolean'

                    return (
                      <tr key={producto.id}>
                        <td>
                          {producto.imagen ? (
                            <img src={producto.imagen} alt={producto.nombre} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ width: '50px', height: '50px', backgroundColor: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fa-solid fa-utensils text-muted"></i>
                            </div>
                          )}
                        </td>
                        <td><strong>{producto.nombre}</strong></td>
                        <td className="text-muted" style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {producto.descripcion || '-'}
                        </td>
                        <td>${parseFloat(producto.precio).toLocaleString('es-CO')}</td>
                        <td>
                          {esAdministrador ? (
                            <div className="d-flex align-items-center gap-2">
                              <div className="form-check form-switch mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  checked={Boolean(disponibilidad)}
                                  disabled={!puedeCambiarDisponibilidad || updatingAvailabilityId === producto.id}
                                  onChange={() => handleToggleDisponibilidad(producto)}
                                  aria-label={`Cambiar disponibilidad de ${producto.nombre}`}
                                  style={{ cursor: puedeCambiarDisponibilidad ? 'pointer' : 'not-allowed' }}
                                />
                              </div>
                              {disponibilidad ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle">
                                  <i className="fa-solid fa-circle-check me-1"></i>Disponible
                                </span>
                              ) : (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                  <i className="fa-solid fa-ban me-1"></i>No disponible
                                </span>
                              )}
                            </div>
                          ) : (
                            producto.disponible ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                <i className="fa-solid fa-circle-check me-1"></i>Activo
                              </span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                <i className="fa-solid fa-ban me-1"></i>Inactivo
                              </span>
                            )
                          )}
                        </td>
                        {esSuperadmin && (
                          <td>
                            <button className="btn btn-sm btn-outline-primary" title="Editar producto" onClick={() => openEditModal(producto)}>
                              <FiEdit2 />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de creación/edición del catálogo: solo SUPERADMIN */}
      {showModal && esSuperadmin && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.35)' }} tabIndex="-1">
          <div className="modal-dialog modal-md">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                <h5 className="modal-title">
                  {modalMode === 'crear' ? (
                    <><FiPlus style={{ marginRight: '8px' }} /> Agregar Producto</>
                  ) : (
                    <><FiEdit2 style={{ marginRight: '8px' }} /> Modificar Producto</>
                  )}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nombre del producto</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Hamburguesa Clásica"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Descripción</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Descripción del producto"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Precio</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      placeholder="Ej: 28900"
                      required
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">URL de la imagen</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={formData.imagen}
                      onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Sucursales donde estará disponible</label>
                    <div className="border rounded p-3">
                      {sucursales.length === 0 ? (
                        <div className="text-muted small">No hay sucursales disponibles para seleccionar.</div>
                      ) : (
                        sucursales.map(sucursal => (
                          <div className="form-check mb-2" key={sucursal.id}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`sucursal-${sucursal.id}`}
                              checked={formData.sucursalIds.includes(Number(sucursal.id))}
                              onChange={() => toggleSucursal(sucursal.id)}
                              disabled={!sucursal.activa}
                            />
                            <label className="form-check-label" htmlFor={`sucursal-${sucursal.id}`}>
                              {sucursal.nombre}
                              {!sucursal.activa && <span className="text-danger ms-2">(inactiva)</span>}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={closeModal}>
                    <FiX style={{ marginRight: '5px' }} /> Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                    {modalMode === 'crear' ? (
                      <><FiPlus style={{ marginRight: '5px' }} /> Crear</>
                    ) : (
                      <><FiPower style={{ marginRight: '5px' }} /> Guardar cambios</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Productos
