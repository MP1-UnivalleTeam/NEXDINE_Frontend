import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import api from '../services/api.js'
import { rutaInicio, ubicarRuta } from '../config/navegacion.js'
import { colores } from '../styles/tokens.js'

export const CLAVE_AVISO = 'nexdine.aviso'

/**
 * Protege una ruta: sin sesión lleva al inicio de sesión y, si el rol no
 * tiene acceso, lleva a la pantalla de inicio de ese rol y explica por qué
 * (en vez de mostrar una página en blanco o un error del servidor).
 */
function RutaProtegida({ roles, children }) {
  const ubicacion = useLocation()
  const [estado, setEstado] = useState({ cargando: true, usuario: null })

  useEffect(() => {
    let activo = true
    api.get('/api/auth/me')
      .then(({ data }) => { if (activo) setEstado({ cargando: false, usuario: data }) })
      .catch(() => { if (activo) setEstado({ cargando: false, usuario: null }) })
    return () => { activo = false }
  }, [ubicacion.pathname])

  if (estado.cargando) {
    return (
      <div role="status" aria-label="Cargando" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  if (!estado.usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  }

  if (roles && !roles.includes(estado.usuario.rol)) {
    const destino = rutaInicio(estado.usuario.rol)
    const modulo = ubicarRuta(ubicacion.pathname)?.modulo?.etiqueta
    try {
      sessionStorage.setItem(CLAVE_AVISO, modulo
        ? `Tu rol no tiene acceso a "${modulo}". Te llevamos a tu pantalla de inicio.`
        : 'Esa página no está disponible para tu rol.')
    } catch {
      // Sin almacenamiento: se redirige sin aviso.
    }
    return <Navigate to={destino} replace />
  }

  return children
}

/** Ruta desconocida o raíz: lleva al inicio del rol si hay sesión, si no al login. */
export function RedireccionInicio() {
  const [destino, setDestino] = useState(null)
  useEffect(() => {
    api.get('/api/auth/me')
      .then(({ data }) => setDestino(rutaInicio(data?.rol)))
      .catch(() => setDestino('/login'))
  }, [])
  if (!destino) return null
  return <Navigate to={destino} replace />
}

export default RutaProtegida
