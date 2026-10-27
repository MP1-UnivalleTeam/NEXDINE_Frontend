import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiEdit2, FiX, FiTrash2, FiCamera, FiUploadCloud, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import CargadorImagen from '../components/CargadorImagen.jsx'
import GestionCupones from '../components/GestionCupones.jsx'
import { obtenerMensajeError, MENSAJES, CARGANDO } from '../services/mensajes.js'
import { colores, sombras, radios, tarjeta, btnPrimario, btnGhost, estiloBadge, input, cifrasTabulares } from '../styles/tokens.js'

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
    precio: ''
  })

  // Imagen del producto (CargadorImagen)
  const [archivoImagen, setArchivoImagen] = useState(null)
  const [previewImagen, setPreviewImagen] = useState(null)
  const [urlImagenManual, setUrlImagenManual] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  // Límites del backend (GET /productos/imagenes/config)
  const [configImagen, setConfigImagen] = useState({ maxBytes: 5 * 1024 * 1024 })

  // Checklist de sucursales donde se ofrece el producto
  const [selectedSucursales, setSelectedSucursales] = useState([])
  const [loadingSucursalesProducto, setLoadingSucursalesProducto] = useState(false)
  const [errorSucursalesProducto, setErrorSucursalesProducto] = useState('')
  const solicitudSucursalesRef = useRef(0)

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
  const [showGestionCupones, setShowGestionCupones] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!showModal && !showUploadModal && !showCategoryModal && !showDeleteModal) return

    const manejarEscape = (evento) => {
      if (evento.key !== 'Escape') return
      evento.preventDefault()

      if (showUploadModal) {
        setShowUploadModal(false)
      } else if (showCategoryModal && !creatingCategory) {
        closeCreateCategoryModal()
      } else if (showDeleteModal && !deleting) {
        closeDeleteModal()
      } else if (showModal && !saving) {
        closeModal()
      }
    }

    window.addEventListener('keydown', manejarEscape)
    return () => window.removeEventListener('keydown', manejarEscape)
  }, [
    showModal, showUploadModal, showCategoryModal, showDeleteModal,
    creatingCategory, deleting, saving
  ])

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

  /** Límites reales de la integración de imágenes (Cloudinary + validador). */
  const loadConfigImagen = async () => {
    try {
      const response = await api.get('/productos/imagenes/config')
      if (response.data?.tamanoMaximoBytes) {
        setConfigImagen({
          maxBytes: response.data.tamanoMaximoBytes,
          cloudinaryDisponible: response.data.cloudinaryDisponible
        })
      }
    } catch (err) {
      // Configuración por defecto (5 MB); el backend igual valida al guardar
      console.error('Error cargando configuración de imágenes:', err)
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
    const solicitud = ++solicitudSucursalesRef.current
    setLoadingSucursalesProducto(true)
    setErrorSucursalesProducto('')
    try {
      const response = await api.get(`/productos/${productoId}/sucursales`)
      if (!Array.isArray(response.data)) {
        throw new Error('La respuesta de sucursales no tiene el formato esperado.')
      }
      if (solicitud === solicitudSucursalesRef.current) {
        setSelectedSucursales(response.data.map(String))
      }
    } catch (err) {
      if (solicitud === solicitudSucursalesRef.current) {
        setSelectedSucursales([])
        setErrorSucursalesProducto(
          obtenerMensajeError(err, 'No fue posible cargar las sucursales del producto.')
        )
      }
    } finally {
      if (solicitud === solicitudSucursalesRef.current) {
        setLoadingSucursalesProducto(false)
      }
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

  // --- Gestión de la imagen en el formulario ---

  const abrirCargadorImagen = () => {
    setShowUploadModal(true)
  }

  const quitarImagenSeleccionada = () => {
    if (previewImagen) {
      URL.revokeObjectURL(previewImagen)
    }
    setPreviewImagen(null)
    setArchivoImagen(null)
    setUrlImagenManual('')
  }

  const asignarArchivo = (archivo) => {
    if (archivo === null) {
      quitarImagenSeleccionada()
      return
    }
    if (previewImagen) {
      URL.revokeObjectURL(previewImagen)
    }
    setArchivoImagen(archivo)
    setPreviewImagen(URL.createObjectURL(archivo))
    setUrlImagenManual('')
  }

  const asignarUrlManual = (url) => {
    if (!url) return
    quitarImagenSeleccionada()
    setUrlImagenManual(url)
  }

  const imagenActualModal = archivoImagen
    ? { tipo: 'archivo', preview: previewImagen }
    : urlImagenManual
      ? { tipo: 'url', url: urlImagenManual }
      : selectedProducto?.imagen && modalMode === 'editar'
        ? { tipo: 'existente-url', url: selectedProducto.imagen }
        : null

  // Abrir modal para crear
  const openCreateModal = () => {
    solicitudSucursalesRef.current += 1
    quitarImagenSeleccionada()
    setFormData({ nombre: '', descripcion: '', precio: '' })
    setSelectedSucursales([])
    setLoadingSucursalesProducto(false)
    setErrorSucursalesProducto('')
    setCategoriaId('')
    setSelectedProducto(null)
    setModalMode('crear')
    setErrorMessage('')
    setShowModal(true)
    loadConfigImagen()
  }

  // Marcar / desmarcar una sucursal del checklist
  const toggleSucursal = (sucursalId) => {
    const id = String(sucursalId)
    setSelectedSucursales(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }

  // Marcar / desmarcar todas
  const toggleTodasSucursales = () => {
    setSelectedSucursales(prev => (
      prev.length === sucursales.length ? [] : sucursales.map(s => String(s.id))
    ))
  }

  // Abrir modal para editar
  const openEditModal = (producto) => {
    solicitudSucursalesRef.current += 1
    // Sin archivo nuevo y sin URL manual: la imagen actual del producto
    // se conserva porque no se envía el campo imagen.
    quitarImagenSeleccionada()
    setSelectedProducto(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio
    })
    setCategoriaId(producto.categoriaId || '')
    setModalMode('editar')
    setErrorMessage('')
    setSelectedSucursales([])
    setLoadingSucursalesProducto(true)
    setErrorSucursalesProducto('')
    setShowModal(true)
    loadConfigImagen()
    // Checklist refleja las relaciones reales de producto_sucursal
    cargarSucursalesDeProducto(producto.id)
  }

  // Cerrar modal
  const closeModal = (forzar = false) => {
    if (saving && !forzar) return
    solicitudSucursalesRef.current += 1
    quitarImagenSeleccionada()
    setShowModal(false)
    setFormData({ nombre: '', descripcion: '', precio: '' })
    setSelectedProducto(null)
    setSelectedSucursales([])
    setLoadingSucursalesProducto(false)
    setErrorSucursalesProducto('')
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
  const closeDeleteModal = (forzar = false) => {
    if (deleting && !forzar) return
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
      closeDeleteModal(true)
      await loadProductos()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      // El producto permanece en la lista
      closeDeleteModal(true)
      setErrorMessage(obtenerMensajeError(err, 'No fue posible eliminar el producto.'))
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setDeleting(false)
    }
  }

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
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

    if (loadingSucursalesProducto) {
      setErrorMessage('Espera a que termine la carga de las sucursales.')
      return
    }

    if (errorSucursalesProducto) {
      setErrorMessage('No se pudieron cargar las sucursales. Intenta cargarlas nuevamente antes de guardar.')
      return
    }

    // Al crear, debe seleccionarse al menos una sucursal
    if (selectedSucursales.length === 0) {
      setErrorMessage('Debe seleccionar al menos una sucursal donde se ofrece el producto')
      return
    }

    setSaving(true)

    try {
      if (archivoImagen) {
        // Multipart: el backend recibe el archivo y lo sube a Cloudinary
        const fd = new FormData()
        fd.append('nombre', formData.nombre.trim())
        fd.append('descripcion', formData.descripcion || '')
        fd.append('precio', formData.precio)
        if (categoriaId) fd.append('categoriaId', categoriaId)
        selectedSucursales.forEach(id => fd.append('sucursalIds', id))
        fd.append('imagen', archivoImagen)

        if (modalMode === 'crear') {
          await api.post('/productos/create', fd)
          setSuccessMessage(MENSAJES.PRODUCTO_CREADO)
        } else {
          await api.put(`/productos/${selectedProducto.id}`, fd)
          setSuccessMessage(MENSAJES.PRODUCTO_ACTUALIZADO)
        }
      } else if (urlImagenManual) {
        // URL externa explícita: el backend la registra como imagen
        const params = new URLSearchParams()
        params.append('nombre', formData.nombre.trim())
        params.append('descripcion', formData.descripcion || '')
        params.append('precio', formData.precio)
        if (categoriaId) {
          params.append('categoriaId', categoriaId)
        }
        selectedSucursales.forEach(id => params.append('sucursalIds', id))
        params.append('imagen', urlImagenManual)

        if (modalMode === 'crear') {
          await api.post('/productos/create', params)
          setSuccessMessage(MENSAJES.PRODUCTO_CREADO)
        } else {
          await api.put(`/productos/${selectedProducto.id}`, params)
          setSuccessMessage(MENSAJES.PRODUCTO_ACTUALIZADO)
        }
      } else if (modalMode === 'crear') {
        // Crear sin imagen
        const params = new URLSearchParams()
        params.append('nombre', formData.nombre.trim())
        params.append('descripcion', formData.descripcion || '')
        params.append('precio', formData.precio)
        if (categoriaId) {
          params.append('categoriaId', categoriaId)
        }
        selectedSucursales.forEach(id => params.append('sucursalIds', id))

        await api.post('/productos/create', params)
        setSuccessMessage(MENSAJES.PRODUCTO_CREADO)
      } else {
        // EDITAR sin nueva imagen: NO se envía el campo imagen para
        // conservar la imagen actual del producto (incluido su publicId).
        const params = new URLSearchParams()
        params.append('nombre', formData.nombre.trim())
        params.append('descripcion', formData.descripcion || '')
        params.append('precio', formData.precio)
        if (categoriaId) {
          params.append('categoriaId', categoriaId)
        }
        selectedSucursales.forEach(id => params.append('sucursalIds', id))

        await api.put(`/productos/${selectedProducto.id}`, params)
        setSuccessMessage(MENSAJES.PRODUCTO_ACTUALIZADO)
      }

      setSaving(false)
      closeModal(true)
      await loadProductos()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setSaving(false)
      setErrorMessage(obtenerMensajeError(err, 'No fue posible guardar el producto.'))
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

  const esAdmin = !esSuperadmin()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      {/* Sidebar compartido */}
      <Sidebar currentUser={currentUser} rutaActual="/productos" onLogout={handleLogout} />

      {/* Main Content */}
      <div style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Productos</h2>
            <small style={{ color: colores.textoSuave }}>
              Catálogo global del restaurante y disponibilidad por sucursal
            </small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* RF012: solo SUPERADMIN crea productos del catálogo global */}
            {esSuperadmin() && (
              <button className="btn d-flex align-items-center" style={{ ...btnPrimario, minHeight: '44px' }} onClick={openCreateModal}>
                <FiPlus style={{ marginRight: '5px' }} /> Agregar Producto
              </button>
            )}
            {esAdmin && miSucursal && (
              <span style={estiloBadge(colores.exitoFondo, colores.exitoTexto)}>
                Sucursal: {miSucursal.nombre}
              </span>
            )}
            <span className="text-muted">Hola, <strong>{currentUser.nombre}</strong></span>
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=11362E&color=fff`}
              className="rounded-circle"
              width="40"
              height="40"
              alt="Avatar"
            />
          </div>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div style={{
            ...tarjeta,
            backgroundColor: colores.exitoFondo, border: `1px solid ${colores.exitoFondo}`,
            color: colores.exitoTexto,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', marginBottom: '16px'
          }}>
            <FiCheckCircle size={18} style={{ color: colores.exito }} />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Mensaje de error */}
        {errorMessage && (
          <div style={{
            ...tarjeta,
            backgroundColor: colores.errorFondo, border: `1px solid ${colores.errorFondo}`,
            color: colores.errorTexto,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', marginBottom: '16px'
          }}>
            <FiXCircle size={18} style={{ color: colores.error }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* ADMINISTRADOR sin sucursal asignada */}
        {esAdmin && !miSucursal && (
          <div style={{
            ...tarjeta,
            backgroundColor: colores.advertenciaFondo, border: `1px solid ${colores.advertenciaFondo}`,
            color: colores.advertenciaTexto,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', marginBottom: '16px'
          }}>
            <FiAlertTriangle size={18} style={{ color: colores.advertencia }} />
            <div>
              El administrador no tiene una sucursal asignada. Contacte al superadmin.
            </div>
          </div>
        )}

        {/* Tabla de Productos */}
        <div style={{ ...tarjeta, padding: '20px', overflowX: 'auto' }}>
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '640px' }}>
            <thead style={{ color: colores.textoSuave }}>
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
                  <td colSpan={esSuperadmin() ? 6 : 5} style={{ textAlign: 'center', color: colores.textoSuave, padding: '40px 8px' }}>
                    <i className="fa-solid fa-utensils fa-2x mb-2 d-block" style={{ color: colores.textoSuaveClaro }}></i>
                    No hay productos registrados
                  </td>
                </tr>
              ) : (
                productos.map(producto => (
                  <tr key={producto.id}>
                    <td>
                      {producto.imagen ? (
                        <img src={producto.imagen} alt={producto.nombre} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: radios.sm, border: `1px solid ${colores.borde}` }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', backgroundColor: colores.superficie, borderRadius: radios.sm, border: `1px solid ${colores.borde}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fa-solid fa-utensils" style={{ color: colores.textoSuaveClaro }}></i>
                        </div>
                      )}
                    </td>
                    <td><strong style={{ color: colores.texto }}>{producto.nombre}</strong></td>
                    <td style={{ color: colores.textoSuave, maxWidth: '260px', fontSize: '13px', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        overflow: 'hidden'
                      }}>
                        {producto.descripcion?.trim() || '-'}
                      </span>
                    </td>
                    <td className="tnum" style={{ color: colores.texto, fontWeight: 600, ...cifrasTabulares }}>
                      ${parseFloat(producto.precio).toLocaleString('es-CO')}
                    </td>
                    <td>
                      {esSuperadmin() ? (
                        /* SUPERADMIN: la disponibilidad es por sucursal, se gestiona al editar */
                        <span style={estiloBadge(colores.superficie, colores.textoSuave)}>
                          {producto.disponible ? 'Catálogo activo' : 'Catálogo inactivo'}
                        </span>
                      ) : producto.disponibleEnMiSucursal === null ? (
                        /* ADMIN: producto no asociado a su sucursal */
                        <span
                          style={estiloBadge(colores.advertenciaFondo, colores.advertenciaTexto)}
                          title="El producto no está asociado a su sucursal"
                        >
                          No asociado
                        </span>
                      ) : (
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 'auto', borderColor: colores.borde, color: colores.texto }}
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
                          <button className="btn btn-sm" title="Editar producto" onClick={() => openEditModal(producto)}
                            style={{ ...btnGhost, minHeight: '36px', padding: '0 10px' }}>
                            <FiEdit2 />
                          </button>
                          <button className="btn btn-sm" title="Eliminar producto" onClick={() => openDeleteModal(producto)}
                            style={{ ...btnGhost, minHeight: '36px', padding: '0 10px', color: colores.error }}>
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
        {(esAdmin || esSuperadmin()) && (
          <div className="d-flex justify-content-end mt-3">
            <button
              type="button"
              className="btn"
              style={{ ...btnGhost, minHeight: '44px', padding: '0 16px' }}
              onClick={() => setShowGestionCupones(true)}
            >
              Administrar cupones de descuento
            </button>
          </div>
        )}
      </div>

      {showGestionCupones && (
        <GestionCupones onClose={() => setShowGestionCupones(false)} />
      )}

      {/* Modal Reutilizable con Backdrop */}
      {showModal && (
        <>
          {/* Backdrop / Overlay */}
          <div
            onClick={() => closeModal()}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: sombras.backdrop,
              backdropFilter: 'blur(4px)',
              zIndex: 1040,
              cursor: saving ? 'wait' : 'default'
            }}
          />
          {/* Modal */}
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-md" style={{ maxWidth: '600px' }}>
              <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Encabezado */}
                <div style={{ padding: '20px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: radios.md,
                      backgroundColor: colores.primario, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {modalMode === 'crear' ? <FiPlus size={18} /> : <FiEdit2 size={18} />}
                    </div>
                    <div>
                      <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
                        {modalMode === 'crear' ? 'Agregar Producto' : 'Modificar Producto'}
                      </h5>
                      <small style={{ color: colores.textoSuave }}>
                        Datos visibles para comensal y meseros
                      </small>
                    </div>
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

                    {/* Fila: foto + nombre */}
                    <div className="row g-3 mb-3">
                      {/* Miniatura / zona de subida */}
                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold">Foto</label>
                        <button
                          type="button"
                          onClick={abrirCargadorImagen}
                          style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: radios.md,
                            border: `2px dashed ${colores.borde}`,
                            backgroundColor: colores.superficie,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '6px', cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                          aria-label="Seleccionar imagen del producto"
                        >
                          {imagenActualModal ? (
                            <>
                              <img
                                src={imagenActualModal.tipo === 'url' ? imagenActualModal.url : imagenActualModal.preview || imagenActualModal.url}
                                alt="Imagen del producto"
                                style={{
                                  position: 'absolute', inset: 0,
                                  width: '100%', height: '100%', objectFit: 'cover'
                                }}
                              />
                              <span style={{
                                position: 'absolute', bottom: '6px', right: '6px',
                                backgroundColor: 'rgba(17,54,46,0.85)', color: '#fff',
                                borderRadius: radios.sm, padding: '4px 8px',
                                fontSize: '11px', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}>
                                <FiUploadCloud size={12} /> Cambiar
                              </span>
                            </>
                          ) : (
                            <>
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                backgroundColor: colores.mint, color: colores.primario,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <FiCamera size={18} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: colores.primario }}>+ Foto</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="col-12 col-md-8">
                        <div>
                          <label className="form-label small fw-semibold">Nombre del producto</label>
                          <input
                            type="text"
                            placeholder="Ej: Hamburguesa Clásica"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            style={{ ...input, width: '100%' }}
                          />
                        </div>
                        <div className="mt-3">
                          <label className="form-label small fw-semibold">
                            Precio
                            <span className="ms-1" style={{ color: colores.textoSuave, fontWeight: 400 }}>(COP)</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ej: 28900"
                            required
                            value={formData.precio}
                            onChange={(e) => setFormData({...formData, precio: e.target.value})}
                            style={{ ...input, width: '100%' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Descripción</label>
                      <textarea
                        rows="2"
                        placeholder="Descripción del producto"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                        style={{ ...input, width: '100%', height: 'auto', minHeight: '72px', padding: '10px 12px' }}
                      />
                    </div>

                    {/* Categoría */}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Categoría</label>
                      <select
                        value={categoriaId}
                        onChange={(e) => {
                          if (e.target.value === CREAR_CATEGORIA) {
                            setCategoriaId('')
                            openCreateCategoryModal()
                          } else {
                            setCategoriaId(e.target.value)
                          }
                        }}
                        style={{ ...input, width: '100%' }}
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
                    <div className="mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-label small fw-semibold mb-0">
                          Sucursales donde se ofrece
                        </label>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0"
                          style={{ color: colores.secundario, fontSize: '0.78rem', fontWeight: 600 }}
                          onClick={toggleTodasSucursales}
                          disabled={loadingSucursalesProducto || Boolean(errorSucursalesProducto)}
                        >
                          {selectedSucursales.length === sucursales.length
                            ? 'Desmarcar todas'
                            : 'Seleccionar todas'}
                        </button>
                      </div>

                      {sucursales.length === 0 ? (
                        <div style={{
                          backgroundColor: colores.advertenciaFondo, color: colores.advertenciaTexto,
                          borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px'
                        }}>
                          No hay sucursales registradas para este restaurante.
                        </div>
                      ) : (
                        <>
                          {loadingSucursalesProducto && (
                            <small role="status" style={{ color: colores.textoSuave, display: 'block', marginBottom: '8px' }}>
                              Cargando sucursales asociadas...
                            </small>
                          )}
                          {errorSucursalesProducto && (
                            <div role="alert" style={{
                              backgroundColor: colores.errorFondo, color: colores.errorTexto,
                              borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px', marginBottom: '8px'
                            }}>
                              {errorSucursalesProducto}{' '}
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0"
                                onClick={() => cargarSucursalesDeProducto(selectedProducto.id)}
                              >
                                Reintentar
                              </button>
                            </div>
                          )}
                          <div
                            className="row g-2"
                            style={{ maxHeight: '160px', overflowY: 'auto' }}
                          >
                            {sucursales.map(s => {
                              const checked = selectedSucursales.includes(String(s.id))
                              return (
                                <div className="col-12 col-md-6" key={s.id}>
                                  <label style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px',
                                    borderRadius: radios.sm,
                                    border: checked ? `1px solid ${colores.primario}` : `1px solid ${colores.borde}`,
                                    backgroundColor: checked ? colores.mint : colores.tarjeta,
                                    cursor: 'pointer', fontSize: '13px', color: colores.texto,
                                    fontWeight: 500
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={loadingSucursalesProducto || Boolean(errorSucursalesProducto)}
                                      onChange={() => toggleSucursal(s.id)}
                                      style={{ accentColor: colores.primario }}
                                    />
                                    {s.nombre}
                                    {!s.activa && <small style={{ color: colores.textoSuave }}>(inactiva)</small>}
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}

                      <small style={{ color: colores.textoSuave, display: 'block', marginTop: '8px' }}>
                        El producto se crea una sola vez en el catálogo y se ofrece en las
                        sucursales seleccionadas.
                      </small>
                    </div>
                  </div>

                  {/* Pie del modal */}
                  <div style={{
                    borderTop: `1px solid ${colores.borde}`,
                    backgroundColor: colores.superficie,
                    padding: '14px 24px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    position: 'sticky',
                    bottom: 0
                  }}>
                    <button type="button" className="btn" onClick={() => closeModal()} disabled={saving} style={{ ...btnGhost, minHeight: '44px', padding: '0 16px' }}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn"
                      style={{ ...btnPrimario, minHeight: '44px', padding: '0 18px' }}
                      disabled={saving || loadingSucursalesProducto || Boolean(errorSucursalesProducto)}
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
                        <><FiPlus style={{ marginRight: '5px' }} /> Crear producto</>
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

      {/* Cargador de imagen (arrastra y suelta) */}
      <CargadorImagen
        visible={showUploadModal}
        onCerrar={() => setShowUploadModal(false)}
        archivoSeleccionado={archivoImagen}
        previewUrl={previewImagen}
        urlManual={urlImagenManual}
        onArchivo={asignarArchivo}
        onUrl={asignarUrlManual}
        maxBytes={configImagen.maxBytes}
      />

      {/* Modal Crear Categoría */}
      {showCategoryModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeCreateCategoryModal}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1060
            }}
          />
          {/* Modal */}
          <div className="modal show" style={{ display: 'block', zIndex: 1070 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-sm" style={{ maxWidth: '420px' }}>
              <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0 24px' }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Crear categoría</h5>
                </div>
                <form onSubmit={handleCreateCategory}>
                  <div style={{ padding: '16px 24px' }}>
                    {categoryError && (
                      <div style={{
                        backgroundColor: colores.errorFondo, color: colores.errorTexto,
                        borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px', marginBottom: '12px'
                      }}>
                        {categoryError}
                      </div>
                    )}
                    <label className="form-label small fw-semibold">Nombre</label>
                    <input
                      type="text"
                      placeholder="Ej: Bebidas"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      style={{ ...input, width: '100%' }}
                    />
                    <small style={{ color: colores.textoSuave, display: 'block', marginTop: '6px' }}>
                      La categoría quedará asociada a su restaurante.
                    </small>
                  </div>
                  <div style={{
                    borderTop: `1px solid ${colores.borde}`,
                    backgroundColor: colores.superficie,
                    padding: '14px 24px',
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                  }}>
                    <button type="button" className="btn" onClick={closeCreateCategoryModal} style={{ ...btnGhost, minHeight: '44px', padding: '0 16px' }}>
                      <FiX style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                    <button type="submit" className="btn" style={{ ...btnPrimario, minHeight: '44px', padding: '0 16px' }} disabled={creatingCategory}>
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
            onClick={() => closeDeleteModal()}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: sombras.backdrop,
              backdropFilter: 'blur(4px)',
              zIndex: 1040
            }}
          />
          {/* Modal */}
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
                  <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Eliminar Producto</h5>
                </div>
                <div style={{ padding: '0 24px 20px 24px' }}>
                  <p>¿Estás seguro de que deseas eliminar este producto?</p>
                  <p style={{ marginBottom: 0, color: colores.texto, fontWeight: 600 }}>
                    {productoAEliminar?.nombre}
                  </p>
                </div>
                <div style={{
                  borderTop: `1px solid ${colores.borde}`,
                  backgroundColor: colores.superficie,
                  padding: '14px 24px',
                  display: 'flex', justifyContent: 'flex-end', gap: '10px'
                }}>
                  <button type="button" className="btn" onClick={() => closeDeleteModal()} disabled={deleting} style={{ ...btnGhost, minHeight: '44px', padding: '0 16px' }}>
                    <FiX style={{ marginRight: '5px' }} /> Cancelar
                  </button>
                  <button type="button" className="btn" onClick={confirmDelete} disabled={deleting} style={{
                    backgroundColor: colores.error, borderColor: colores.error,
                    color: 'white', fontWeight: 600, borderRadius: radios.sm, minHeight: '44px', padding: '0 16px'
                  }}>
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
