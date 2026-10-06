/**
 * Sidebar compartido de las vistas administrativas.
 *
 * Centraliza las condiciones de permisos para que el menú lateral sea
 * idéntico en Dashboard, Productos y Mesas, independientemente de la ruta.
 *
 * Permisos:
 *   · ADMINISTRADOR / SUPERADMIN → Usuarios, Productos, Mesas, Pedidos, Reportes
 *   · CLIENTE                   → Ver Menú
 */

const LINK_BASE = {
  color: 'rgba(255,255,255,0.8)',
  padding: '12px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
}

const LINK_ACTIVO = {
  backgroundColor: '#2c5a4d',
  borderLeft: '4px solid #fff',
  color: 'white',
  fontWeight: 600,
  padding: '12px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
}

function Sidebar({ currentUser, rutaActual, onLogout }) {
  if (!currentUser) return null

  const esAdmin = currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'SUPERADMIN'
  const esSuperadmin = currentUser.rol === 'SUPERADMIN'
  const esCliente = currentUser.rol === 'CLIENTE'

  const estilo = (ruta) => (rutaActual === ruta ? LINK_ACTIVO : LINK_BASE)

  return (
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
        {esCliente && (
          <li className="nav-item">
            <a href="/menu" className="nav-link" style={estilo('/menu')}>
              <i className="fa-solid fa-utensils"></i> Ver Menú
            </a>
          </li>
        )}

        {esAdmin && (
          <>
            <li className="nav-item">
              <a href="/dashboard" className="nav-link" style={estilo('/dashboard')}>
                <i className="fa-solid fa-users"></i> Usuarios
              </a>
            </li>
            <li className="nav-item">
              <a href="/productos" className="nav-link" style={estilo('/productos')}>
                <i className="fa-solid fa-utensils"></i> Productos
              </a>
            </li>
            <li className="nav-item">
              <a href="/mesas" className="nav-link" style={estilo('/mesas')}>
                <i className="fa-solid fa-table-cells"></i> Mesas
              </a>
            </li>
            {esSuperadmin && (
              <li className="nav-item">
                <a href="/sucursales" className="nav-link" style={estilo('/sucursales')}>
                  <i className="fa-solid fa-store"></i> Sucursales
                </a>
              </li>
            )}
            <li className="nav-item">
              <a href="#" className="nav-link" style={LINK_BASE}>
                <i className="fa-solid fa-receipt"></i> Pedidos
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className="nav-link" style={LINK_BASE}>
                <i className="fa-solid fa-chart-line"></i> Reportes
              </a>
            </li>
          </>
        )}
      </ul>

      <div style={{ position: 'absolute', bottom: '20px', width: '100%', padding: '0 20px' }}>
        <a
          href="/login"
          onClick={(e) => { e.preventDefault(); if (onLogout) onLogout() }}
          className="text-white text-decoration-none"
        >
          <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
        </a>
      </div>
    </div>
  )
}

export default Sidebar