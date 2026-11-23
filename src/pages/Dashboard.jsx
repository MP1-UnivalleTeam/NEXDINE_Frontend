import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { obtenerMensajeError, MENSAJES } from '../services/mensajes.js'
import { colores, tarjeta } from '../styles/tokens.js'

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Formulario de creación
  const [newUser, setNewUser] = useState({
    nombre: '',
    contraseña: '',
    rol: 'COCINERO',
    celular: '',
    direccion: '',
    sucursalId: ''
  })

  // Sucursales permitidas para asignar
  const [sucursales, setSucursales] = useState([])

  // Mensajes de éxito / error
  const [successMessage, setSuccessMessage] = useState('')
  const [formError, setFormError] = useState('')

  // Búsqueda por ID visual
  const [searchId, setSearchId] = useState('')
  const [filtroId, setFiltroId] = useState(null)
  const [busquedaError, setBusquedaError] = useState('')

  // Estado de operaciones para evitar dobles envíos
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [actualizandoUsuario, setActualizandoUsuario] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState('')

  // Modal de edición
  const [showEditModal, setShowEditModal] = useState(false)
  const [editUser, setEditUser] = useState({
    id: '',
    nombre: '',
    rol: 'COCINERO',
    celular: '',
    direccion: '',
    sucursalId: ''
  })
  const [editUserSucursalLoading, setEditUserSucursalLoading] = useState(false)
  const [editUserSucursalError, setEditUserSucursalError] = useState('')
  const editUserSucursalRequest = useRef(0)

  /**
   * El servicio identifica a los usuarios por UUID. La tabla muestra un ID
   * numérico secuencial según el orden del listado cargado; las operaciones
   * siguen usando el UUID real de cada usuario.
   */
  const usuariosConId = useMemo(
    () => users.map((user, indice) => ({ ...user, idVisual: indice + 1 })),
    [users]
  )

  const usuariosVisibles = useMemo(
    () => (filtroId == null
      ? usuariosConId
      : usuariosConId.filter(user => user.idVisual === filtroId)),
    [usuariosConId, filtroId]
  )

  const busquedaSinResultados = filtroId != null && usuariosVisibles.length === 0

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setCurrentUser(response.data)
      await Promise.all([loadUsers(), loadSucursales()])
    } catch (err) {
      navigate('/login')
    }
  }

  const loadSucursales = async () => {
    try {
      const response = await api.get('/users/sucursales')
      setSucursales(response.data)
    } catch (err) {
      console.error('Error cargando sucursales:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoading(false)
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

  const esSuperadmin = () => currentUser?.rol === 'SUPERADMIN'

  // Un empleado operativo (no CLIENTE) admite sucursal
    // La asignación es opcional: el SUPERADMIN puede dejarla "Sin asignar".
    const requiereSucursal = (rol) => rol !== 'CLIENTE'

  // Modal de creación de usuario
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)

  useEffect(() => {
    if (!showEditModal && !showCreateUserModal) return

    const manejarEscape = (evento) => {
      if (evento.key !== 'Escape') return
      evento.preventDefault()
      if (showEditModal) {
        closeEditUserModal()
      } else {
        setShowCreateUserModal(false)
        setFormError('')
      }
    }

    window.addEventListener('keydown', manejarEscape)
    return () => window.removeEventListener('keydown', manejarEscape)
  }, [showEditModal, showCreateUserModal])

  const openCreateUserModal = () => {
    setFormError('')
    setNewUser({
      nombre: '',
      contraseña: '',
      rol: 'COCINERO',
      celular: '',
      direccion: '',
      sucursalId: ''
    })
    setShowCreateUserModal(true)
  }

  /**
   * Carga la sucursal REAL del usuario desde el backend antes de editar.
   * Evita que el selector aparezca "Sin asignar" cuando sí tiene sucursal.
   */
  const cargarSucursalDeUsuario = async (userId) => {
    const requestId = ++editUserSucursalRequest.current
    setEditUserSucursalLoading(true)
    setEditUserSucursalError('')
    try {
      const response = await api.get(`/users/${userId}/sucursal`)
      const sid = response.data?.sucursalId ?? ''
      if (requestId === editUserSucursalRequest.current) {
        setEditUser(prev => prev.id === userId ? { ...prev, sucursalId: sid ? String(sid) : '' } : prev)
      }
    } catch (err) {
      console.error('Error cargando sucursal del usuario:', err)
      if (requestId === editUserSucursalRequest.current) {
        setEditUserSucursalError(obtenerMensajeError(err, 'No fue posible consultar la sucursal asignada.'))
      }
    } finally {
      if (requestId === editUserSucursalRequest.current) {
        setEditUserSucursalLoading(false)
      }
    }
  }

  const closeEditUserModal = () => {
    editUserSucursalRequest.current += 1
    setShowEditModal(false)
    setEditUserSucursalError('')
    setEditUserSucursalLoading(false)
  }

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false)
    setFormError('')
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (creandoUsuario) return
    setFormError('')
    setSuccessMessage('')

    if (!newUser.nombre.trim()) {
      setFormError('El nombre de usuario es obligatorio')
      return
    }

    const rol = newUser.rol

    if (rol === 'ADMINISTRADOR' && !esSuperadmin()) {
      setFormError('Solo el superadministrador puede registrar al dueño de la empresa.')
      return
    }

    const params = new URLSearchParams()
    params.append('nombre', newUser.nombre.trim())
    params.append('contraseña', newUser.contraseña)
    params.append('rol', rol)
    params.append('celular', newUser.celular)
    params.append('direccion', newUser.direccion)
    if (esSuperadmin() && newUser.sucursalId) {
      params.append('sucursalId', newUser.sucursalId)
    }

    setCreandoUsuario(true)
    try {
      await api.post('/users/create', params)
      setSuccessMessage(MENSAJES.USUARIO_CREADO)
      setShowCreateUserModal(false)
      setNewUser({ nombre: '', contraseña: '', rol: 'COCINERO', celular: '', direccion: '', sucursalId: '' })
      await loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      if (err.response) {
        if (err.response.status === 409) {
          setFormError(err.response.data?.error || 'No se puede crear el usuario porque ya existe.')
        } else {
          setFormError(obtenerMensajeError(err, 'No fue posible crear el usuario.'))
        }
      } else {
        setFormError(obtenerMensajeError(err, 'No fue posible crear el usuario.'))
      }
    } finally {
      setCreandoUsuario(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const valor = Number(searchId)
    if (!Number.isInteger(valor) || valor <= 0) {
      setBusquedaError('Ingresa un ID numérico válido.')
      setFiltroId(null)
      return
    }
    setBusquedaError('')
    setFiltroId(valor)
  }

  const limpiarBusqueda = () => {
    setSearchId('')
    setFiltroId(null)
    setBusquedaError('')
  }

  const handleEdit = (user) => {
    editUserSucursalRequest.current += 1
    setEditUserSucursalError('')
    setEditUserSucursalLoading(false)
    setEditUser({
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      celular: user.celular,
      direccion: user.direccion,
      sucursalId: user.sucursalId ? String(user.sucursalId) : ''
    })
    setFormError('')
    setShowEditModal(true)
    if (esSuperadmin()) {
      cargarSucursalDeUsuario(user.id)
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    if (actualizandoUsuario) return
    setFormError('')
    if (esSuperadmin() && (editUserSucursalLoading || editUserSucursalError)) {
      setFormError('Consulta la sucursal asignada antes de guardar los cambios.')
      return
    }
    const params = new URLSearchParams()
    params.append('id', editUser.id)
    params.append('nombre', editUser.nombre)
    params.append('rol', editUser.rol)
    params.append('celular', editUser.celular)
    params.append('direccion', editUser.direccion)
    if (esSuperadmin()) {
      if (editUser.sucursalId) {
        params.append('sucursalId', editUser.sucursalId)
      } else {
        params.append('quitarSucursal', 'true')
      }
    }

    setActualizandoUsuario(true)
    try {
      await api.post('/users/edit', params)
      setShowEditModal(false)
      setSuccessMessage(MENSAJES.USUARIO_ACTUALIZADO)
      await loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setFormError(obtenerMensajeError(err, 'No fue posible actualizar el usuario.'))
    } finally {
      setActualizandoUsuario(false)
    }
  }

  const handleDelete = async (user) => {
    if (procesandoAccion || !window.confirm(`¿Eliminar a ${user.nombre}?`)) return
    const params = new URLSearchParams()
    params.append('id', user.id)
    setProcesandoAccion(`delete:${user.id}`)
    try {
      await api.post('/users/delete', params)
      setSuccessMessage(MENSAJES.USUARIO_ELIMINADO)
      await loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setFormError(obtenerMensajeError(err, 'No fue posible eliminar el usuario.'))
      setTimeout(() => setFormError(''), 4000)
    } finally {
      setProcesandoAccion('')
    }
  }

  const handleToggle = async (user) => {
    if (procesandoAccion) return
    setFormError('')
    const params = new URLSearchParams()
    params.append('id', user.id)
    setProcesandoAccion(`toggle:${user.id}`)
    try {
      await api.post('/users/toggle', params)
      setSuccessMessage(user.estado ? MENSAJES.USUARIO_SUSPENDIDO : MENSAJES.USUARIO_ACTIVADO)
      await loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setFormError(obtenerMensajeError(err, 'No fue posible cambiar el estado del usuario.'))
      setTimeout(() => setFormError(''), 4000)
    } finally {
      setProcesandoAccion('')
    }
  }

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (!currentUser) return null

  const isAdmin = () => currentUser?.rol === 'ADMINISTRADOR' || currentUser?.rol === 'SUPERADMIN'

  const getRoleBadge = (rol) => {
    const styles = {
      ADMINISTRADOR: { bg: colores.errorFondo, color: '#B91C1C', border: '#FECACA', icon: 'fa-shield-halved', label: 'Administrador' },
      SUPERADMIN: { bg: colores.primario, color: '#ffffff', border: colores.primario, icon: 'fa-crown', label: 'Superadmin' },
      COCINERO: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: 'fa-fire-flame-curved', label: 'Cocinero' },
      MESERO: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: 'fa-bell-concierge', label: 'Mesero' },
      CLIENTE: { bg: colores.exitoFondo, color: colores.exitoTexto, border: '#A7F3D0', icon: 'fa-user', label: 'Cliente' }
    }
    const style = styles[rol] || styles.CLIENTE
    return (
      <span style={{
        fontSize: '0.82rem',
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: '20px',
        display: 'inline-block',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`
      }}>
        <i className={`fa-solid ${style.icon} me-1`}></i>{style.label}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Sidebar compartido */}
      <Sidebar currentUser={currentUser} rutaActual="/dashboard" onLogout={handleLogout} />

      {/* Main Content */}
      <div style={{ marginLeft: '260px', flex: 1, padding: '30px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2>{currentUser.rol === 'CLIENTE' ? 'Menú del Restaurante' : 'Gestión de Usuarios'}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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

        {/* VISTA CLIENTE */}
        {currentUser.rol === 'CLIENTE' && (
          <div className="row">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="col-md-3 mb-3">
                <div className="card p-3 text-center" style={tarjeta}>
                  <img src="https://via.placeholder.com/150" className="mb-2 rounded" alt="Producto" />
                  <h5>Hamburguesa</h5>
                  <p className="text-muted">$28.900</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA ADMIN/EMPLEADO */}
        {currentUser.rol !== 'CLIENTE' && (
          <>
            {/* Botón Crear Usuario (Solo Admin) */}
            {isAdmin() && (
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">Gestión de Usuarios</h4>
                <button
                  className="btn btn-sm"
                  style={{ backgroundColor: colores.primario, color: 'white' }}
                  onClick={openCreateUserModal}
                >
                  <FiPlus style={{ marginRight: '5px' }} /> Registrar usuario
                </button>
              </div>
            )}

            {successMessage && (
              <div className="alert alert-success py-2 small" role="alert">
                <i className="fa-solid fa-circle-check me-1"></i>{successMessage}
              </div>
            )}

            {/* Buscar Usuario */}
            {isAdmin() && (
              <div className="card p-3 mb-4" style={tarjeta}>
                <h5 className="mb-3">
                  <i className="fa-solid fa-magnifying-glass me-2"></i>
                  Buscar Usuario
                </h5>
                <form onSubmit={handleSearch}>
                  <div className="row g-2 align-items-end">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold" htmlFor="buscar-usuario-id">ID del usuario</label>
                      <input
                        id="buscar-usuario-id"
                        type="number"
                        min="1"
                        step="1"
                        className="form-control form-control-sm"
                        placeholder="[ Ej: 1 ]"
                        required
                        value={searchId}
                        onChange={(e) => { setSearchId(e.target.value); setBusquedaError('') }}
                      />
                    </div>
                    <div className="col-md-2">
                      <button type="submit" className="btn btn-sm w-100" style={{ backgroundColor: colores.primario, color: 'white' }}>
                        <i className="fa-solid fa-search me-1"></i>Buscar
                      </button>
                    </div>
                    <div className="col-md-2">
                      <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={limpiarBusqueda}>
                        Limpiar
                      </button>
                    </div>
                  </div>
                  {busquedaError && (
                    <div className="text-danger small mt-2" role="alert">{busquedaError}</div>
                  )}
                </form>
              </div>
            )}

            {/* Estado de la búsqueda */}
            {filtroId != null && (
              <div className="card p-3 mb-3" style={tarjeta}>
                {busquedaSinResultados ? (
                  <div className="alert alert-warning py-2 small mb-0 d-flex justify-content-between align-items-center gap-2 flex-wrap" role="status">
                    <span><i className="fa-solid fa-circle-info me-1"></i>No existe un usuario con el ID {filtroId}.</span>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={limpiarBusqueda}>
                      Ver todos
                    </button>
                  </div>
                ) : (
                  <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <span className="small text-muted">
                      <i className="fa-solid fa-filter me-1"></i>Mostrando el usuario con ID {filtroId}.
                    </span>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={limpiarBusqueda}>
                      Limpiar búsqueda
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tabla de Usuarios */}
            <div className="card p-4" style={tarjeta}>
              <table className="table table-hover align-middle">
                <thead className="text-muted">
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Sucursal</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                    <th>Estado</th>
                    {isAdmin() && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {usuariosVisibles.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin() ? 8 : 7} className="text-center text-muted py-4">
                        No hay usuarios para mostrar.
                      </td>
                    </tr>
                  )}
                  {usuariosVisibles.map(user => (
                    <tr key={user.id}>
                      <td><strong>{user.idVisual}</strong></td>
                      <td><strong>{user.nombre}</strong></td>
                      <td>{getRoleBadge(user.rol)}</td>
                      <td className="text-muted">
                        {user.sucursalId
                          ? (sucursales.find(s => s.id === user.sucursalId)?.nombre ?? `#${user.sucursalId}`)
                          : <span className="text-secondary">Sin asignar</span>}
                      </td>
                      <td>{user.celular}</td>
                      <td>{user.direccion}</td>
                      <td>
                        {user.estado ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            <i className="fa-solid fa-circle-check me-1"></i>
                            Activo
                          </span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                            <i className="fa-solid fa-ban me-1"></i>
                            Suspendido
                          </span>
                        )}
                      </td>
                      {isAdmin() && (
                        <td>
                          <button
                            className={`btn btn-sm ${user.estado ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            title={user.estado ? 'Suspender usuario' : 'Activar usuario'}
                            disabled={Boolean(procesandoAccion)}
                            onClick={() => handleToggle(user)}
                          >
                            <i className={`fa-solid ${user.estado ? 'fa-ban' : 'fa-circle-check'}`}></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary ms-1"
                            title="Editar usuario"
                            disabled={Boolean(procesandoAccion)}
                            onClick={() => handleEdit(user)}
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          {esSuperadmin() && (
                            <button
                              className="btn btn-sm btn-outline-danger ms-1"
                              title="Eliminar usuario"
                              disabled={Boolean(procesandoAccion)}
                              onClick={() => handleDelete(user)}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de Edición */}
      {showEditModal && (
        <>
          <div onClick={closeEditUserModal} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(17, 54, 46, 0.35)', zIndex: 1040
          }} />
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: colores.primario, color: 'white' }}>
                  <h5 className="modal-title"><i className="fa-solid fa-pen me-2"></i>Editar Usuario</h5>
                  <button type="button" className="btn-close btn-close-white" aria-label="Cerrar" onClick={closeEditUserModal}></button>
                </div>
                <form onSubmit={handleUpdateUser}>
                  <div className="modal-body">
                    {formError && (
                      <div className="alert alert-danger py-2 small" role="alert">
                        <i className="fa-solid fa-circle-exclamation me-1"></i>{formError}
                      </div>
                    )}
                    {editUserSucursalError && (
                      <div className="alert alert-danger py-2 small" role="alert">
                        {editUserSucursalError}{' '}
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0"
                          onClick={() => cargarSucursalDeUsuario(editUser.id)}
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                    <input type="hidden" name="id" value={editUser.id} />
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Nuevo nombre de usuario</label>
                      <input
                        type="text"
                        name="nombre"
                        className="form-control"
                        required
                        value={editUser.nombre}
                        onChange={(e) => setEditUser({...editUser, nombre: e.target.value})}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Rol</label>
                      <select
                        name="rol"
                        className="form-select"
                        value={editUser.rol}
                        onChange={(e) => setEditUser({...editUser, rol: e.target.value})}
                      >
                        {esSuperadmin() && <option value="ADMINISTRADOR">Administrador</option>}
                        <option value="MESERO">Mesero</option>
                        <option value="COCINERO">Cocinero</option>
                      </select>
                    </div>

                    {/* Asignar / reasignar / quitar sucursal: solo SUPERADMIN */}
                    {esSuperadmin() && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Sucursal</label>
                        <select
                          name="sucursalId"
                          className="form-select"
                          value={editUser.sucursalId || ''}
                          disabled={editUserSucursalLoading || Boolean(editUserSucursalError)}
                          onChange={(e) => setEditUser({...editUser, sucursalId: e.target.value})}
                        >
                          <option value="">Sin asignar</option>
                          {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                        {editUserSucursalLoading && (
                          <small className="text-muted" role="status">Consultando sucursal asignada...</small>
                        )}
                        <small className="text-muted">
                          Cambiar o quitar la sucursal reemplaza la asignación actual.
                        </small>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Teléfono</label>
                      <input
                        type="number"
                        name="celular"
                        className="form-control"
                        value={editUser.celular}
                        onChange={(e) => setEditUser({...editUser, celular: e.target.value})}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Dirección</label>
                      <input
                        type="text"
                        name="direccion"
                        className="form-control"
                        value={editUser.direccion}
                        onChange={(e) => setEditUser({...editUser, direccion: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={closeEditUserModal} disabled={actualizandoUsuario}>Cancelar</button>
                    <button
                      type="submit"
                      className="btn btn-sm"
                      style={{ backgroundColor: colores.primario, color: 'white' }}
                      disabled={actualizandoUsuario || editUserSucursalLoading || Boolean(editUserSucursalError)}
                    >
                      {actualizandoUsuario ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Crear Usuario */}
      {showCreateUserModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeCreateUserModal}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(17, 54, 46, 0.35)', zIndex: 1040
            }}
          />
          {/* Modal */}
          <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-md">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: colores.primario, color: 'white' }}>
                  <h5 className="modal-title">
                    <FiPlus style={{ marginRight: '8px' }} /> Registrar usuario
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={closeCreateUserModal}></button>
                </div>
                <form onSubmit={handleCreateUser}>
                  <div className="modal-body">
                    {formError && (
                      <div className="alert alert-danger d-flex align-items-center py-2" role="alert">
                        <i className="fa-solid fa-circle-exclamation me-2"></i>
                        <div className="small">{formError}</div>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nombre de usuario</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: maria123"
                        required
                        value={newUser.nombre}
                        onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Celular</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="3001234567"
                        required
                        value={newUser.celular}
                        onChange={(e) => setNewUser({ ...newUser, celular: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Contraseña</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Contraseña"
                        required
                        value={newUser.contraseña}
                        onChange={(e) => setNewUser({ ...newUser, contraseña: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Rol</label>
                      <select
                        className="form-select"
                        value={newUser.rol}
                        onChange={(e) => setNewUser({ ...newUser, rol: e.target.value, sucursalId: '' })}
                      >
                        {esSuperadmin() && <option value="ADMINISTRADOR">Administrador</option>}
                        <option value="MESERO">Mesero</option>
                        <option value="COCINERO">Cocinero</option>
                      </select>
                    </div>

                    {/* Sucursal: solo si el rol la requiere */}
                    {requiereSucursal(newUser.rol) && (
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Sucursal</label>
                        {esSuperadmin() ? (
                          <select
                            className="form-select"
                            value={newUser.sucursalId}
                            onChange={(e) => setNewUser({ ...newUser, sucursalId: e.target.value })}
                          >
                            <option value="">Sin asignar</option>
                            {sucursales.map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <input
                              type="text"
                              className="form-control"
                              value={sucursales[0]?.nombre || 'Su sucursal'}
                              disabled
                            />
                            <small className="text-muted">
                              Se asignará automáticamente a su sucursal.
                            </small>
                          </>
                        )}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Dirección</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Calle 123 #45-67"
                        value={newUser.direccion}
                        onChange={(e) => setNewUser({ ...newUser, direccion: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={closeCreateUserModal} disabled={creandoUsuario}>
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm"
                      style={{ backgroundColor: colores.primario, color: 'white' }}
                      disabled={creandoUsuario}
                    >
                      {creandoUsuario ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>Registrando…
                        </>
                      ) : (
                        <><FiPlus style={{ marginRight: '5px' }} /> Registrar</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function chipEstilo(activo) {
  return {
    minHeight: '38px',
    padding: '0 13px',
    borderRadius: 9999,
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
    borderRadius: 8,
    border: activo ? `1px solid ${colores.primario}` : `1px solid ${colores.borde}`,
    backgroundColor: activo ? colores.primario : colores.tarjeta,
    color: activo ? '#FFF' : colores.texto,
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer'
  }
}

export default Dashboard
