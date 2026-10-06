import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiEdit2, FiX } from 'react-icons/fi'
import api from '../services/api.js'

function Productos() {
  const [currentUser, setCurrentUser] = useState(null)
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('crear') // 'crear' o 'editar'
  const [selectedProducto, setSelectedProducto] = useState(null)

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    imagen: ''
  })

  // Mensajes
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setCurrentUser(response.data)
      if (response.data.rol !== 'ADMINISTRADOR') {
        navigate('/dashboard')
      } else {
        await loadProductos()
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
      setProductos(response.data)
    } catch (err) {
      console.error('Error cargando productos:', err)
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

  // Abrir modal para crear
  const openCreateModal = () => {
    setFormData({ nombre: '', descripcion: '', precio: '', imagen: '' })
    setModalMode('crear')
    setErrorMessage('')
    setShowModal(true)
  }

  // Abrir modal para editar
  const openEditModal = (producto) => {
    setSelectedProducto(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      imagen: producto.imagen || ''
    })
    setModalMode('editar')
    setErrorMessage('')
    setShowModal(true)
  }

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false)
    setFormData({ nombre: '', descripcion: '', precio: '', imagen: '' })
    setSelectedProducto(null)
    setErrorMessage('')
  }

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    // Validaciones
    if (!formData.nombre || formData.nombre.trim() === '') {
      setErrorMessage('El nombre del producto es obligatorio')
      return
    }

    if (!formData.precio || formData.precio === '') {
      setErrorMessage('El precio del producto es obligatorio')
      return
    }

    const precioNum = parseFloat(formData.precio)
    if (isNaN(precioNum) || precioNum < 0) {
      setErrorMessage('El precio debe ser un valor válido y no negativo')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', formData.nombre.trim())
    params.append('descripcion', formData.descripcion || '')
    params.append('precio', formData.precio)
    params.append('imagen', formData.imagen || '')

    try {
      if (modalMode === 'crear') {
        await api.post('/productos/create', params)
        setSuccessMessage('Producto agregado exitosamente')
      } else {
        await api.put(`/productos/${selectedProducto.id}`, params)
        setSuccessMessage('Producto actualizado exitosamente')
      }

      closeModal()
      await loadProductos()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setErrorMessage('No ha iniciado sesión')
        } else if (err.response.status === 403) {
          setErrorMessage('No tiene permisos para realizar esta acción')
        } else if (err.response.status === 400) {
          setErrorMessage(err.response.data.error || 'Datos inválidos')
        } else if (err.response.status === 404) {
          setErrorMessage('El producto no existe')
        } else if (err.response.status === 500) {
          setErrorMessage(err.response.data.error || 'Error en el servidor')
        } else {
          setErrorMessage('Error en la solicitud')
        }
      } else {
        setErrorMessage('Error de conexión con el servidor')
      }
    }
  }

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (!currentUser) return null

  return (
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
              <i className="fa-solid fa-utensils"></i> Producto
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
          <li className="nav-item">
            <a href="#" className="nav-link" style={{
              color: 'rgba(255,255,255,0.8)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fa-solid fa-chart-line"></i> Reportes
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2>Producto</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn" style={{ backgroundColor: '#1a3c34', color: 'white' }} onClick={openCreateModal}>
              <FiPlus style={{ marginRight: '5px' }} /> Agregar Producto
            </button>
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

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="alert alert-success d-flex align-items-center" role="alert">
            <i className="fa-solid fa-circle-check me-2"></i>
            <div>{successMessage}</div>
          </div>
        )}

        {/* Tabla de Productos */}
        <div className="card p-4" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
          <table className="table table-hover align-middle">
            <thead className="text-muted">
              <tr>
                <th>Imagen</th>
                <th>Producto</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    <i className="fa-solid fa-utensils fa-2x mb-2 d-block" style={{ color: '#ccc' }}></i>
                    No hay productos registrados
                  </td>
                </tr>
              ) : (
                productos.map(producto => (
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
                    <td className="text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {producto.descripcion || '-'}
                    </td>
                    <td>${parseFloat(producto.precio).toLocaleString('es-CO')}</td>
                    <td>
                      {producto.disponible ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          <i className="fa-solid fa-circle-check me-1"></i>
                          Disponible
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          <i className="fa-solid fa-ban me-1"></i>
                          No disponible
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" title="Editar producto" onClick={() => openEditModal(producto)}>
                        <FiEdit2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reutilizable */}
      {showModal && (
        <div className="modal show" style={{ display: 'block' }} tabIndex="-1">
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
                  {errorMessage && (
                    <div className="alert alert-danger d-flex align-items-center" role="alert">
                      <i className="fa-solid fa-circle-exclamation me-2"></i>
                      <div>{errorMessage}</div>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nombre del producto</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Hamburguesa Clásica"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Descripción</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Descripción del producto"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Precio</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      placeholder="Ej: 28900"
                      required
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">URL de la imagen</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={formData.imagen}
                      onChange={(e) => setFormData({...formData, imagen: e.target.value})}
                    />
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
                      <><FiEdit2 style={{ marginRight: '5px' }} /> Guardar cambios</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Productos
