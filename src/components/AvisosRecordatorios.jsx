import { useEffect, useState } from 'react'
import { FiBell, FiX } from 'react-icons/fi'
import { leerRecordatoriosLocales, recordatoriosPendientes, marcarEjecutados, obtenerAvisosServidor } from '../services/recordatorios.js'
import { colores, radios, sombras } from '../styles/tokens.js'

const INTERVALO_MS = 30000

const CLAVE_VISTOS = 'nexdine.recordatorios.vistos'

function leerVistos() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(CLAVE_VISTOS) || '[]'))
  } catch {
    return new Set()
  }
}

function guardarVistos(vistos) {
  try {
    sessionStorage.setItem(CLAVE_VISTOS, JSON.stringify([...vistos].slice(-50)))
  } catch {
    // Sin almacenamiento: puede repetirse un aviso al recargar.
  }
}

/**
 * Muestra en pantalla los recordatorios que disparó el servidor (RF027) y,
 * si quedan, los guardados solo en este navegador. Se monta junto al
 * Sidebar, así funciona en cualquier vista administrativa.
 */
function AvisosRecordatorios() {
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    let desdeServidor = null
    const vistos = leerVistos()

    const mostrar = (lista) => {
      if (lista.length === 0) return
      setAvisos(prev => [...prev, ...lista.map(r => ({ id: `${r.id}-${Date.now()}`, titulo: r.titulo, mensaje: r.mensaje }))].slice(-4))
      if ('Notification' in window && Notification.permission === 'granted') {
        lista.forEach(r => {
          try { new Notification(`Recordatorio: ${r.titulo}`, { body: r.mensaje || '', tag: `recordatorio-${r.id}` }) } catch { /* sin soporte */ }
        })
      }
    }

    const revisar = async () => {
      const locales = recordatoriosPendientes(leerRecordatoriosLocales())
      if (locales.length > 0) {
        marcarEjecutados(locales.map(r => r.id))
        mostrar(locales)
      }
      try {
        const { avisos: delServidor, ahora } = await obtenerAvisosServidor(desdeServidor)
        desdeServidor = ahora
        const nuevos = delServidor.filter(r => !vistos.has(`${r.id}|${r.ultimaEjecucion}`))
        nuevos.forEach(r => vistos.add(`${r.id}|${r.ultimaEjecucion}`))
        guardarVistos(vistos)
        mostrar(nuevos)
      } catch {
        // Servidor sin el servicio o sin conexión: solo quedan los locales.
      }
    }
    revisar()
    const temporizador = setInterval(revisar, INTERVALO_MS)
    window.addEventListener('nexdine-recordatorios', revisar)
    return () => {
      clearInterval(temporizador)
      window.removeEventListener('nexdine-recordatorios', revisar)
    }
  }, [])

  if (avisos.length === 0) return null

  return (
    <div aria-live="assertive" style={{
      position: 'fixed', bottom: '16px', right: '16px', left: '16px', zIndex: 1090,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', pointerEvents: 'none'
    }}>
      {avisos.map(aviso => (
        <div key={aviso.id} role="alert" style={{
          pointerEvents: 'auto', maxWidth: '380px', width: '100%', backgroundColor: colores.tarjeta,
          borderLeft: `4px solid ${colores.advertencia}`, borderRadius: radios.md, boxShadow: sombras.nivel3,
          padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start'
        }}>
          <FiBell style={{ color: colores.advertencia, flexShrink: 0, marginTop: '3px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <small style={{ color: colores.textoSuave, fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em' }}>
              Recordatorio
            </small>
            <div style={{ fontWeight: 700, color: colores.texto }}>{aviso.titulo}</div>
            {aviso.mensaje && <div style={{ fontSize: '13px', color: colores.textoSuave }}>{aviso.mensaje}</div>}
          </div>
          <button type="button" aria-label="Descartar recordatorio"
            onClick={() => setAvisos(prev => prev.filter(a => a.id !== aviso.id))}
            style={{ border: 'none', background: 'transparent', color: colores.textoSuave, cursor: 'pointer', padding: 0 }}>
            <FiX />
          </button>
        </div>
      ))}
    </div>
  )
}

export default AvisosRecordatorios
