import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [searchedUser, setSearchedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Formulario de creación
  const [newUser, setNewUser] = useState({
    nombre: '',
    contraseña: '',
    rol: 'COCINERO',
    celular: '',
    direccion: ''
  })

  // Búsqueda
  const [searchId, setSearchId] = useState('')

  // Modal de edición
  const [showEditModal, setShowEditModal] = useState(false)
  const [editUser, setEditUser] = useState({
    id: '',
    nombre: '',
    rol: 'CLIENTE',
    celular: '',
    direccion: ''
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setCurrentUser(response.data)
      await loadUsers()
    } catch (err) {
      navigate('/login')
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

  const handleCreateUser = async (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.append('nombre', newUser.nombre)
    params.append('contraseña', newUser.contraseña)
    params.append('rol', newUser.rol)
    params.append('celular', newUser.celular)
    params.append('direccion', newUser.direccion)

    try {
      await api.post('/users/create', params)
      setNewUser({ nombre: '', contraseña: '', rol: 'COCINERO', celular: '', direccion: '' })
      await loadUsers()
    } catch (err) {
      console.error('Error creando usuario:', err)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    try {
      const response = await api.get(`/users/search?id=${searchId}`)
      setSearchedUser(response.data)
    } catch (err) {
      setSearchedUser(null)
    }
  }

  const handleEdit = (user) => {
    setEditUser({
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      celular: user.celular,
      direccion: user.direccion
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.append('id', editUser.id)
    params.append('nombre', editUser.nombre)
    params.append('rol', editUser.rol)
    params.append('celular', editUser.celular)
    params.append('direccion', editUser.direccion)

    try {
      await api.post('/users/edit', params)
      setShowEditModal(false)
      await loadUsers()
    } catch (err) {
      console.error('Error editando usuario:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return
    const params = new URLSearchParams()
    params.append('id', id)
    try {
      await api.post('/users/delete', params)
      await loadUsers()
    } catch (err) {
      console.error('Error eliminando usuario:', err)
    }
  }

  const handleToggle = async (id) => {
    const params = new URLSearchParams()
    params.append('id', id)
    try {
      await api.post('/users/toggle', params)
      await loadUsers()
    } catch (err) {
      console.error('Error cambiando estado:', err)
    }
  }

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (!currentUser) return null

  const getRoleBadge = (rol) => {
    const styles = {
      ADMINISTRADOR: { bg: '#fde8e8', color: '#c0392b', border: '#f5c6cb', icon: 'fa-shield-halved', label: 'Administrador' },
      COCINERO: { bg: '#e8f0fe', color: '#1a56db', border: '#b8d0fb', icon: 'fa-fire-flame-curved', label: 'Cocinero' },
      MESERO: { bg: '#e8f0fe', color: '#1a56db', border: '#b8d0fb', icon: 'fa-bell-concierge', label: 'Mesero' },
      CLIENTE: { bg: '#e6f9f0', color: '#1a7a4a', border: '#a8e6c4', icon: 'fa-user', label: 'Cliente' }
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
          {currentUser.rol !== 'CLIENTE' && (
            <li className="nav-item">
              <a href="/dashboard" className="nav-link" style={{
                backgroundColor: '#2c5a4d',
                borderLeft: '4px solid #fff',
                color: 'white',
                fontWeight: 600,
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fa-solid fa-users"></i> Usuarios
              </a>
            </li>
          )}
          {currentUser.rol === 'CLIENTE' && (
            <li className="nav-item">
              <a href="/menu" className="nav-link" style={{
                backgroundColor: '#2c5a4d',
                borderLeft: '4px solid #fff',
                color: 'white',
                fontWeight: 600,
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fa-solid fa-utensils"></i> Ver Menú
              </a>
            </li>
          )}
          {currentUser.rol !== 'CLIENTE' && (
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
          )}
          {currentUser.rol === 'ADMINISTRADOR' && (
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
          )}
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
          <h2>{currentUser.rol === 'CLIENTE' ? 'Menú del Restaurante' : 'Gestión de Usuarios'}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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

        {/* VISTA CLIENTE */}
        {currentUser.rol === 'CLIENTE' && (
          <div className="row">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="col-md-3 mb-3">
                <div className="card p-3 text-center" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
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
            {/* Crear Nuevo Usuario (Solo Admin) */}
            {currentUser.rol === 'ADMINISTRADOR' && (
              <div className="card p-3 mb-4" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                <h5 className="mb-3"><i className="fa-solid fa-user-plus me-2"></i>Crear Nuevo Usuario</h5>
                <form onSubmit={handleCreateUser}>
                  <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Nombre de usuario</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ej: maria123"
                        required
                        value={newUser.nombre}
                        onChange={(e) => setNewUser({...newUser, nombre: e.target.value})}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Contraseña</label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        placeholder="Contraseña"
                        required
                        value={newUser.contraseña}
                        onChange={(e) => setNewUser({...newUser, contraseña: e.target.value})}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Rol</label>
                      <select
                        className="form-select form-select-sm"
                        value={newUser.rol}
                        onChange={(e) => setNewUser({...newUser, rol: e.target.value})}
                      >
                        <option value="COCINERO">Cocinero</option>
                        <option value="MESERO">Mesero</option>
                        <option value="CLIENTE">Cliente</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <button type="submit" className="btn btn-sm w-100" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                        <i className="fa-solid fa-plus me-1"></i>Crear
                      </button>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Teléfono</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="3001234567"
                        required
                        value={newUser.celular}
                        onChange={(e) => setNewUser({...newUser, celular: e.target.value})}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Dirección</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Calle 123 #45-67"
                        required
                        value={newUser.direccion}
                        onChange={(e) => setNewUser({...newUser, direccion: e.target.value})}
                      />
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Buscar Usuario */}
            {currentUser.rol === 'ADMINISTRADOR' && (
              <div className="card p-3 mb-4" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                <h5 className="mb-3">
                  <i className="fa-solid fa-magnifying-glass me-2"></i>
                  Buscar Usuario
                </h5>
                <form onSubmit={handleSearch}>
                  <div className="row g-2 align-items-end">
                    <div className="col-md-10">
                      <label className="form-label small fw-semibold">ID del usuario</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Ingrese el ID del usuario"
                        required
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <button type="submit" className="btn btn-sm w-100" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                        <i className="fa-solid fa-search me-1"></i>Buscar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Resultado de búsqueda */}
            {searchedUser && (
              <div className="card p-3 mb-3 border-success">
                <h5 className="text-success">
                  <i className="fa-solid fa-circle-check me-2"></i>
                  Usuario encontrado
                </h5>
                <p><strong>ID:</strong> <span>{searchedUser.id}</span></p>
                <p><strong>nombre:</strong> <span>{searchedUser.nombre}</span></p>
                <p><strong>Rol:</strong> <span>{searchedUser.rol}</span></p>
              </div>
            )}

            {/* Tabla de Usuarios */}
            <div className="card p-4" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
              <table className="table table-hover align-middle">
                <thead className="text-muted">
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                    <th>Estado</th>
                    {currentUser.rol === 'ADMINISTRADOR' && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td><span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>#{user.id}</span></td>
                      <td><strong>{user.nombre}</strong></td>
                      <td>{getRoleBadge(user.rol)}</td>
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
                      {currentUser.rol === 'ADMINISTRADOR' && (
                        <td>
                          <button
                            className={`btn btn-sm ${user.estado ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            title={user.estado ? 'Suspender usuario' : 'Activar usuario'}
                            onClick={() => handleToggle(user.id)}
                          >
                            <i className={`fa-solid ${user.estado ? 'fa-ban' : 'fa-circle-check'}`}></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary ms-1"
                            title="Editar usuario"
                            onClick={() => handleEdit(user)}
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger ms-1"
                            title="Eliminar usuario"
                            onClick={() => handleDelete(user.id)}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
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
        <div className="modal show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#1a3c34', color: 'white' }}>
                <h5 className="modal-title"><i className="fa-solid fa-pen me-2"></i>Editar Usuario</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
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
                    <label>Rol</label>
                    <select
                      name="rol"
                      className="form-control mb-3"
                      value={editUser.rol}
                      onChange={(e) => setEditUser({...editUser, rol: e.target.value})}
                    >
                      <option value="CLIENTE">Cliente</option>
                      <option value="MESERO">Mesero</option>
                      <option value="COCINERO">Cocinero</option>
                    </select>

                    <label>Teléfono</label>
                    <input
                      type="number"
                      name="celular"
                      className="form-control mb-3"
                      value={editUser.celular}
                      onChange={(e) => setEditUser({...editUser, celular: e.target.value})}
                    />

                    <label>Dirección</label>
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
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-sm" style={{ backgroundColor: '#1a3c34', color: 'white' }}>Guardar cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
