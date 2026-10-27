/**
 * Sidebar compartido de las vistas administrativas.
 *
 * Centraliza las condiciones de permisos para que el menú lateral sea
 * idéntico en Dashboard, Productos y Mesas, independientemente de la ruta.
 *
 * Permisos:
 *   · ADMINISTRADOR / SUPERADMIN → Usuarios, Productos, Mesas, Pedidos, Reportes
 *   · CLIENTE                   → Ver Menú
 *
 * Visual: guía "Forest Culinary Precision" (DESIGN.md) — fondo verde bosque
 * #11362E, elemento activo con píldora clara y borde de resalte.
 */
import { obtenerContextoMenu } from '../utils/contextoMenu.js'
import { colores } from '../styles/tokens.js'

const LINK_BASE = {
  color: 'rgba(255,255,255,0.78)',
  padding: '12px 20px',
  margin: '4px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px'
}

const LINK_ACTIVO = {
  ...LINK_BASE,
  backgroundColor: 'rgba(255,255,255,0.12)',
  color: '#FFFFFF',
  fontWeight: 600
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
      backgroundColor: colores.primario,
      color: 'white',
      position: 'fixed',
      height: '100%',
      paddingTop: '20px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: '0 20px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className="fa-solid fa-utensils" style={{ color: colores.exito }}></i> NEXDINE
        </div>
        <small style={{ color: 'rgba(255,255,255,0.55)', display: 'block', marginTop: '2px' }}>
          POS &amp; Backoffice
        </small>
      </div>

      <ul className="nav flex-column mt-2" style={{ flex: 1 }}>
        {esCliente && (
          <li className="nav-item">
            <a href={obtenerContextoMenu() || '/menu'} className="nav-link" style={estilo('/menu')}>
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
                <i className="fa-solid fa-chair"></i> Mesas
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
              <span
                className="nav-link"
                style={{ ...LINK_BASE, opacity: 0.5, cursor: 'not-allowed' }}
                title="Próximamente"
              >
                <i className="fa-solid fa-receipt"></i> Pedidos
              </span>
            </li>
            <li className="nav-item">
              <a href="#" className="nav-link" style={LINK_BASE}>
                <i className="fa-solid fa-chart-line"></i> Reportes
              </a>
            </li>
          </>
        )}
      </ul>

      <div style={{
        margin: '0 12px 12px 12px',
        padding: '12px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <img
          src={`https://ui-avatars.com/api/?name=${currentUser.nombre}&background=10B981&color=11362E`}
          className="rounded-circle" width="36" height="36" alt="Avatar"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser.nombre}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            {currentUser.rol === 'SUPERADMIN' ? 'Admin General' : currentUser.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Cliente'}
          </div>
        </div>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colores.exito, flexShrink: 0 }}></span>
      </div>

      <div style={{ padding: '0 20px 20px 20px' }}>
        <a
          href="/login"
          onClick={(e) => { e.preventDefault(); if (onLogout) onLogout() }}
          className="text-white text-decoration-none"
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.78) !important',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
        </a>
      </div>
    </div>
  )
}

export default Sidebar
