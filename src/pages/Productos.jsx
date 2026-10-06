import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiEdit2, FiX, FiTrash2 } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { obtenerMensajeError, MENSAJES, CARGANDO } from '../services/mensajes.js'

function Productos() {
  const [currentUser, setCurrentUser] = useState(null)
  const [productos, setProductos] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCategoriaId] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const esSuperadmin = () => currentUser?.rol === 'SUPERADMIN'

// Valor centinela del selector para abrir el modal de nueva categoría
const CREAR_CATEGORIA = '__nueva_categoria__'

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

  // Checklist de sucursales donde se ofrece el producto
  const [selectedSucursales, setSelectedSucursales] = useState([])

  // Loading del envío
  const [saving, setSaving] = useState(false)

  // RF007: producto cuya disponibilidad se está actualizando
  const [updatingId, setUpdatingId] = useState(null)

  // Eliminación en curso (evita clics duplicados)
  const [deleting, setDeleting] = useState(false)

  // Crear categoría desde el formulario de producto
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  // RF007: sucursal del ADMINISTRADOR (informativa, no se envía)
  const [miSucursal, setMiSucursal] = useState(null)

  // Mensajes
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productoAEliminar, setProductoAEliminar] = useState(null)

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
        await Promise.all([
        loadProductos(),
        loadSucursales(response.data),
        loadCategorias()
      ])
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

  /**
   * Carga las sucursales del restaurante.
   *
   * El usuario se recibe como parámetro (no desde el state) porque al
   * ejecutarse junto a setCurrentUser(), React todavía no ha aplicado
   * el valor: leer `currentUser` aquí devolvería null.
   *
   * Para ADMINISTRADOR el backend devuelve únicamente su sucursal.
   */
  const loadSucursales = async (usuario) => {
    try {
      const response = await api.get('/productos/sucursales')
      setSucursales(response.data)

      if (usuario?.rol === 'ADMINISTRADOR') {
        setMiSucursal(response.data.length > 0 ? response.data[0] : null)
      }
    } catch (err) {
      console.error('Error cargando sucursales:', err)
    }
  }

  const loadCategorias = async () => {
    try {
      const response = await api.get('/productos/categorias')
      setCategorias(response.data)
    } catch (err) {
      console.error('Error cargando categorías:', err)
    }
  }

  // --- Crear categoría desde el formulario de producto ---

  const openCreateCategoryModal = () => {
    setNewCategoryName('')
    setCategoryError('')
    setShowCategoryModal(true)
  }

  const closeCreateCategoryModal = () => {
    setShowCategoryModal(false)
    setNewCategoryName('')
    setCategoryError('')
    setCreatingCategory(false)
  }

  /**
   * Crea la categoría y la selecciona automáticamente.
   * El restaurante lo obtiene el backend desde el contexto del SUPERADMIN:
   * nunca se envía restauranteId.
   */
  const handleCreateCategory = async (e) => {
    e.preventDefault()
    setCategoryError('')

    const nombre = newCategoryName.trim()
    if (!nombre) {
      setCategoryError('El nombre de la categoría es obligatorio.')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', nombre)

    setCreatingCategory(true)

    try {
      const response = await api.post('/categorias', params)
      const creada = response.data

      // Actualizar la lista y seleccionar la nueva categoría
      setCategorias(prev => [...prev, creada].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setCategoriaId(String(creada.id))

      closeCreateCategoryModal()
      setSuccessMessage('Categoría creada correctamente.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setCreatingCategory(false)
      setCategoryError(obtenerMensajeError(err, 'No fue posible crear la categoría.'))
    }
  }

  /**
   * Carga las sucursales realmente asociadas al producto para
   * que el checklist al editar NO aparezca vacío por defecto.
   */
  const cargarSucursalesDeProducto = async (productoId) => {
    try {
      const response = await api.get(`/productos/${productoId}/sucursales`)
      setSelectedSucursales(response.data || [])
    } catch (err) {
      console.error('Error cargando sucursales del producto:', err)
      setSelectedSucursales([])
    }
  }

  /**
   * RF007 — Cambia la disponibilidad del producto en la sucursal del ADMIN.
   * El backend determina la sucursal: no se envía sucursalId.
   */
  const handleCambiarDisponibilidad = async (producto, disponible) => {
    setErrorMessage('')
    setUpdatingId(producto.id)

    const params = new URLSearchParams()
    params.append('disponible', disponible)

    try {
      await api.put(`/productos/${producto.id}/disponibilidad`, params)
      setSuccessMessage(
        `${MENSAJES.DISPONIBILIDAD_ACTUALIZADA}` +
        (miSucursal ? ` en ${miSucursal.nombre}` : '')
      )
      await loadProductos()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      // Refrescar para revertir el valor visual del select
      await loadProductos()
      setErrorMessage(obtenerMensajeError(err, 'No fue posible actualizar la disponibilidad.'))
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setUpdatingId(null)
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
    setSelectedSucursales([])
    setCategoriaId('')
    setModalMode('crear')
    setErrorMessage('')
    setShowModal(true)
  }

  // Marcar / desmarcar una sucursal del checklist
  const toggleSucursal = (sucursalId) => {
    setSelectedSucursales(prev =>
      prev.includes(sucursalId)
        ? prev.filter(id => id !== sucursalId)
        : [...prev, sucursalId]
    )
  }

  // Marcar / desmarcar todas
  const toggleTodasSucursales = () => {
    setSelectedSucursales(prev =>
      prev.length === sucursales.length ? [] : sucursales.map(s => s.id)
    )
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
    setCategoriaId(producto.categoriaId || '')
    setModalMode('editar')
    setErrorMessage('')
    setShowModal(true)
    // Checklist refleja las relaciones reales de producto_sucursal
    cargarSucursalesDeProducto(producto.id)
  }

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false)
    setFormData({ nombre: '', descripcion: '', precio: '', imagen: '' })
    setSelectedProducto(null)
    setSelectedSucursales([])
    setCategoriaId('')
    setErrorMessage('')
    setSaving(false)
  }

  // Abrir modal de confirmación de eliminación
  const openDeleteModal = (producto) => {
    setProductoAEliminar(producto)
    setShowDeleteModal(true)
  }

  // Cerrar modal de confirmación
  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setProductoAEliminar(null)
  }

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!productoAEliminar) return

    setDeleting(true)
    try {
      await api.delete(`/productos/${productoAEliminar.id}`)
      setSuccessMessage(MENSAJES.PRODUCTO_ELIMINADO)
      closeDeleteModal()
      await loadProductos()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      // El producto permanece en la lista
      closeDeleteModal()
      setErrorMessage(obtenerMensajeError(err, 'No fue posible eliminar el producto.'))
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setDeleting(false)
    }
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
    if (isNaN(precioNum)) {
      setErrorMessage('El precio debe ser un valor numérico válido')
      return
    }

    if (precioNum <= 0) {
      setErrorMessage('El precio debe ser mayor que 0')
      return
    }

    // Al crear, debe seleccionarse al menos una sucursal
    if (selectedSucursales.length === 0) {
      setErrorMessage('Debe seleccionar al menos una sucursal donde se ofrece el producto')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', formData.nombre.trim())
    params.append('descripcion', formData.descripcion || '')
    params.append('precio', formData.precio)
    params.append('imagen', formData.imagen || '')

    if (categoriaId) {
      params.append('categoriaId', categoriaId)
    }

    // Una entrada sucursalIds por cada sucursal seleccionada
    selectedSucursales.forEach(id => params.append('sucursalIds', id))

    setSaving(true)

    try {
      if (modalMode === 'crear') {
        await api.post('/productos/create', params)
        setSuccessMessage(MENSAJES.PRODUCTO_CREADO)
      } else {
        await api.put(`/productos/${selectedProducto.id}`, params)
        setSuccessMessage(MENSAJES.PRODUCTO_ACTUALIZADO)
      }

      closeModal()
      await loadProductos()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setSaving(false)
      setErrorMessage(obtenerMensajeError(err, 'No fue posible guardar el producto.'))
    }
  }

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (!currentUser) return null

  const esAdmin = !esSuperadmin()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Sidebar compartido */}
      <Sidebar currentUser={currentUser} rutaActual="/productos" onLogout={handleLogout} />

      {/* Main Content */}
      <div style={{ marginLeft: '260px', flex: 1, padding: '30px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2>Producto</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* RF012: solo SUPERADMIN crea productos del catálogo global */}
            {esSuperadmin() && (
              <button className="btn" style={{ backgroundColor: '#1a3c34', color: 'white' }} onClick={openCreateModal}>
                <FiPlus style={{ marginRight: '5px' }} /> Agregar Producto
              </button>
            )}
            {esAdmin && miSucursal && (
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                Sucursal: {miSucursal.nombre}
              </span>
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

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="alert alert-success d-flex align-items-center" role="alert">
            <i className="fa-solid fa-circle-check me-2"></i>
            <div>{successMessage}</div>
          </div>
        )}

        {/* Mensaje de error */}
        {errorMessage && (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <i className="fa-solid fa-circle-exclamation me-2"></i>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* ADMINISTRADOR sin sucursal asignada */}
        {esAdmin && !miSucursal && (
          <div className="alert alert-warning d-flex align-items-center" role="alert">
            <i className="fa-solid fa-triangle-exclamation me-2"></i>
            <div>
              El administrador no tiene una sucursal asignada. Contacte al superadmin.
            </div>
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
                <th>{esSuperadmin() ? 'Catálogo' : 'Disponibilidad'}</th>
                {/* La configuración global del catálogo es exclusiva del SUPERADMIN */}
                {esSuperadmin() && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={esSuperadmin() ? 6 : 5} className="text-center text-muted py-4">
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
                      {esSuperadmin() ? (
                        /* SUPERADMIN: la disponibilidad es por sucursal, se gestiona al editar */
                        <span className="badge bg-secondary-subtle text-secondary border">
                          {producto.disponible ? 'Catálogo activo' : 'Catálogo inactivo'}
                        </span>
                      ) : producto.disponibleEnMiSucursal === null ? (
                        /* ADMIN: producto no asociado a su sucursal */
                        <span
                          className="badge bg-warning-subtle text-warning border border-warning-subtle"
                          title="El producto no está asociado a su sucursal"
                        >
                          No asociado
                        </span>
                      ) : (
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 'auto' }}
                          value={producto.disponibleEnMiSucursal ? 'disponible' : 'no-disponible'}
                          disabled={updatingId === producto.id}
                          onChange={(e) => handleCambiarDisponibilidad(
                            producto,
                            e.target.value === 'disponible'
                          )}
                        >
                          <option value="disponible">Disponible</option>
                          <option value="no-disponible">No disponible</option>
                        </select>
                      )}
                    </td>
                    {/* Configuración global del catálogo: solo SUPERADMIN */}
                    {esSuperadmin() && (
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-primary" title="Editar producto" onClick={() => openEditModal(producto)}>
                            <FiEdit2 />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" title="Eliminar producto" onClick={() => openDeleteModal(producto)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reutilizable con Backdrop */}
      {showModal && (
        <>
          {/* Backdrop / Overlay */}
          <div 
            onClick={closeModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040
            }}
          />
          {/* Modal */}
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
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

                    {/* Categoría */}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Categoría</label>
                      <select
                        className="form-select"
                        value={categoriaId}
                        onChange={(e) => {
                          if (e.target.value === CREAR_CATEGORIA) {
                            setCategoriaId('')
                            openCreateCategoryModal()
                          } else {
                            setCategoriaId(e.target.value)
                          }
                        }}
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                        {/* Crear categoría: exclusiva del SUPERADMIN */}
                        {esSuperadmin() && (
                          <option value={CREAR_CATEGORIA}>+ Crear nueva categoría</option>
                        )}
                      </select>
                    </div>

                    {/* Checklist de sucursales (crear y editar) */}
                    {(modalMode === 'crear' || modalMode === 'editar') && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label small fw-semibold mb-0">
                            Sucursales donde se ofrece
                          </label>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0"
                            style={{ color: '#1a3c34', fontSize: '0.78rem' }}
                            onClick={toggleTodasSucursales}
                          >
                            {selectedSucursales.length === sucursales.length
                              ? 'Desmarcar todas'
                              : 'Seleccionar todas'}
                          </button>
                        </div>

                        {sucursales.length === 0 ? (
                          <div className="alert alert-warning py-2 small mb-0">
                            No hay sucursales registradas para este restaurante.
                          </div>
                        ) : (
                          <div
                            className="border rounded p-2"
                            style={{ maxHeight: '160px', overflowY: 'auto' }}
                          >
                            {sucursales.map(s => (
                              <div className="form-check" key={s.id}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`suc-${s.id}`}
                                  checked={selectedSucursales.includes(s.id)}
                                  onChange={() => toggleSucursal(s.id)}
                                />
                                <label
                                  className="form-check-label small"
                                  htmlFor={`suc-${s.id}`}
                                  style={!s.activa ? { color: '#999' } : {}}
                                >
                                  {s.nombre}
                                  {!s.activa && ' (inactiva)'}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}

                        <small className="text-muted">
                          El producto se crea una sola vez en el catálogo y se ofrece en las
                          sucursales seleccionadas.
                        </small>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={closeModal}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm"
                      style={{ backgroundColor: '#1a3c34', color: 'white' }}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            style={{ width: '0.8rem', height: '0.8rem' }}
                          ></span>
                          Guardando...
                        </>
                      ) : modalMode === 'crear' ? (
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
        </>
      )}

      {/* Modal Crear Categoría */}
      {showCategoryModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeCreateCategoryModal}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1060
            }}
          />
          {/* Modal */}
          <div className="modal show" style={{ display: 'block', zIndex: 1070 }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                  <h5 className="modal-title">Crear categoría</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={closeCreateCategoryModal}></button>
                </div>
                <form onSubmit={handleCreateCategory}>
                  <div className="modal-body">
                    {categoryError && (
                      <div className="alert alert-danger d-flex align-items-center py-2" role="alert">
                        <i className="fa-solid fa-circle-exclamation me-2"></i>
                        <div className="small">{categoryError}</div>
                      </div>
                    )}
                    <label className="form-label small fw-semibold">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Bebidas"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <small className="text-muted">
                      La categoría quedará asociada a su restaurante.
                    </small>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={closeCreateCategoryModal}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button type="submit" className="btn btn-sm" style={{ backgroundColor: '#1a3c34', color: 'white' }} disabled={creatingCategory}>
                      {creatingCategory ? 'Creando...' : 'Crear categoría'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <>
          {/* Backdrop / Overlay */}
          <div 
            onClick={closeDeleteModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040
            }}
          />
          {/* Modal */}
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                  <h5 className="modal-title">
                    <FiTrash2 style={{ marginRight: '8px' }} /> Eliminar Producto
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={closeDeleteModal}></button>
                </div>
                <div className="modal-body">
                  <p>¿Estás seguro de que deseas eliminar este producto?</p>
                  <p className="text-muted mb-0">
                    <strong>{productoAEliminar?.nombre}</strong>
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={closeDeleteModal}>
                    <FiX style={{ marginRight: '5px' }} /> Cancelar
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={confirmDelete} disabled={deleting}>
                    {deleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.8rem', height: '0.8rem' }}></span>
                        {CARGANDO.ELIMINANDO}
                      </>
                    ) : (
                      <><FiTrash2 style={{ marginRight: '5px' }} /> Eliminar</>
                    )}
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

export default Productos
