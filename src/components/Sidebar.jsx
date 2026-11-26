/**
 * Menú lateral compartido por todas las vistas con sesión.
 *
 * Las opciones salen de config/navegacion.js: cada rol ve solo los módulos
 * de su trabajo, agrupados por tarea. El elemento activo se calcula con la
 * URL, así que siempre coincide con la pantalla abierta. En pantallas
 * pequeñas se convierte en una barra superior con menú desplegable.
 */
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiMenu, FiX, FiLogOut, FiInfo } from 'react-icons/fi'
import { obtenerContextoMenu } from '../utils/contextoMenu.js'
import { sincronizarConPerfil } from '../utils/tema.js'
import { menuParaRol, ubicarRuta, ETIQUETAS_ROL, MODULOS } from '../config/navegacion.js'
import { CLAVE_AVISO } from './RutaProtegida.jsx'
import { colores, radios, sombras } from '../styles/tokens.js'
import AvisosRecordatorios from './AvisosRecordatorios.jsx'
import Avatar from './Avatar.jsx'
import BotonTema from './BotonTema.jsx'

function Sidebar({ currentUser, rutaActual, onLogout }) {
  const ubicacion = useLocation()
  const [abierto, setAbierto] = useState(false)
  const [aviso, setAviso] = useState('')
  const ruta = ubicacion.pathname || rutaActual

  // RF026 / RF029: aplica el tema y el color de acento guardados en el perfil.
  useEffect(() => {
    sincronizarConPerfil(currentUser)
  }, [currentUser?.id, currentUser?.tema, currentUser?.colorAcento])

  // Título de la pestaña del navegador acorde con la pantalla abierta.
  useEffect(() => {
    const modulo = ubicarRuta(ruta)?.modulo
    document.title = modulo ? `${modulo.etiqueta} · NexDine` : 'NexDine'
  }, [ruta])

  // Aviso que deja RutaProtegida cuando se intenta abrir un módulo sin permiso.
  useEffect(() => {
    try {
      const texto = sessionStorage.getItem(CLAVE_AVISO)
      if (texto) {
        setAviso(texto)
        sessionStorage.removeItem(CLAVE_AVISO)
        const t = setTimeout(() => setAviso(''), 6000)
        return () => clearTimeout(t)
      }
    } catch {
      // Sin almacenamiento.
    }
    return undefined
  }, [ruta])

  useEffect(() => { setAbierto(false) }, [ruta])

  useEffect(() => {
    if (!abierto) return undefined
    const escape = (e) => { if (e.key === 'Escape') setAbierto(false) }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [abierto])

  if (!currentUser) return null

  const secciones = menuParaRol(currentUser.rol)
  const esAdmin = currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'SUPERADMIN'
  const contextoGuardado = obtenerContextoMenu()
  const rutaMenuCliente = contextoGuardado && !contextoGuardado.includes('mesa=null') ? contextoGuardado : MODULOS.menu.ruta
  const moduloActual = ubicarRuta(ruta)?.modulo

  const enlace = (item) => {
    const activo = ruta === item.ruta
    const href = item.clave === 'menu' ? rutaMenuCliente : item.ruta
    return (
      <li key={item.clave}>
        <a
          href={href}
          className={`nexdine-enlace${activo ? ' activo' : ''}`}
          aria-current={activo ? 'page' : undefined}
          title={item.descripcion}
        >
          <i className={`fa-solid ${item.icono}`} aria-hidden="true"></i>
          <span>{item.etiqueta}</span>
        </a>
      </li>
    )
  }

  return (
    <>
      {/* Barra superior: solo en pantallas pequeñas */}
      <header className="nexdine-topbar" style={{ backgroundColor: colores.sidebar }}>
        <button type="button" className="nexdine-topbar-boton" aria-label="Abrir menú" aria-expanded={abierto} aria-controls="nexdine-menu" onClick={() => setAbierto(true)}>
          <FiMenu size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {moduloActual?.etiqueta || 'NexDine'}
        </div>
        <a href="/perfil" aria-label="Mi perfil"><Avatar usuario={currentUser} tamano={32} /></a>
      </header>

      {abierto && <div className="nexdine-velo" onClick={() => setAbierto(false)} aria-hidden="true" />}

      <nav
        id="nexdine-menu"
        className={`nexdine-sidebar${abierto ? ' abierto' : ''}`}
        aria-label="Menú principal"
        style={{ backgroundColor: colores.sidebar }}
      >
        <div className="nexdine-marca">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '1px' }}>
            <i className="fa-solid fa-utensils" style={{ color: colores.exito }} aria-hidden="true"></i> NEXDINE
          </div>
          <button type="button" className="nexdine-cerrar-menu" aria-label="Cerrar menú" onClick={() => setAbierto(false)}>
            <FiX size={20} />
          </button>
        </div>

        <div className="nexdine-secciones">
          {secciones.map((seccion, i) => (
            <div key={seccion.titulo || `s${i}`} className="nexdine-seccion">
              {seccion.titulo && <div className="nexdine-seccion-titulo" id={`sec-${i}`}>{seccion.titulo}</div>}
              <ul aria-labelledby={seccion.titulo ? `sec-${i}` : undefined}>
                {seccion.items.map(enlace)}
              </ul>
            </div>
          ))}
        </div>

        <div className="nexdine-usuario">
          <a href="/perfil" className={`nexdine-tarjeta-usuario${ruta === '/perfil' ? ' activo' : ''}`} title="Mi perfil: foto, tema y datos" aria-current={ruta === '/perfil' ? 'page' : undefined}>
            <Avatar usuario={currentUser} tamano={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.nombre}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>
                {ETIQUETAS_ROL[currentUser.rol] || 'Usuario'} · Mi perfil
              </div>
            </div>
          </a>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <BotonTema conSesion variante="oscura" />
            <button type="button" className="nexdine-salir" onClick={() => { if (onLogout) onLogout() }}>
              <FiLogOut aria-hidden="true" /> Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {aviso && (
        <div role="status" style={{
          position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
          maxWidth: 'calc(100% - 32px)', width: '440px', backgroundColor: colores.tarjeta, color: colores.texto,
          borderLeft: `4px solid ${colores.advertencia}`, borderRadius: radios.md, boxShadow: sombras.nivel3,
          padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13.5px'
        }}>
          <FiInfo style={{ color: colores.advertencia, flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
          <span style={{ flex: 1 }}>{aviso}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso('')} style={{ border: 'none', background: 'transparent', color: colores.textoSuave, cursor: 'pointer', padding: 0 }}>
            <FiX />
          </button>
        </div>
      )}

      {/* Avisos de recordatorios programados (solo personal administrativo) */}
      {esAdmin && <AvisosRecordatorios />}
    </>
  )
}

export default Sidebar
