import { useLocation } from 'react-router-dom'
import { FiChevronRight } from 'react-icons/fi'
import { ubicarRuta } from '../config/navegacion.js'
import { colores } from '../styles/tokens.js'

/**
 * Encabezado común de las pantallas: ubicación (sección › módulo), título,
 * descripción breve y acciones principales a la derecha. Así cada pantalla
 * responde igual a "¿dónde estoy?" y "¿qué puedo hacer aquí?".
 */
function EncabezadoPagina({ titulo, descripcion, acciones, children }) {
  const { pathname } = useLocation()
  const ubicacion = ubicarRuta(pathname)
  const tituloFinal = titulo || ubicacion?.modulo?.etiqueta || ''
  const descripcionFinal = descripcion ?? ubicacion?.modulo?.descripcion

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
      <div style={{ minWidth: 0 }}>
        <UbicacionActual />
        <h1 className="h2" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>{tituloFinal}</h1>
        {descripcionFinal && <p style={{ margin: '2px 0 0', color: colores.textoSuave, fontSize: '13.5px' }}>{descripcionFinal}</p>}
        {children}
      </div>
      {acciones && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>{acciones}</div>}
    </header>
  )
}

/** Línea "Sección › Módulo" para saber en qué parte del sistema se está. */
export function UbicacionActual() {
  const { pathname } = useLocation()
  const ubicacion = ubicarRuta(pathname)
  if (!ubicacion?.seccion) return null
  return (
    <nav aria-label="Ubicación" style={{ fontSize: '12px', color: colores.textoSuave, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
      <span>{ubicacion.seccion}</span>
      <FiChevronRight size={12} aria-hidden="true" />
      <span aria-current="page" style={{ color: colores.texto, fontWeight: 600 }}>{ubicacion.modulo.etiqueta}</span>
    </nav>
  )
}

export default EncabezadoPagina
